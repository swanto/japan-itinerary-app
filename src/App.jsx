
import React, { useEffect, useState } from "react";

const JAPAN_IMAGES = [
  // Unsplash images (hotlinking for prototype use). Replace with your own assets in production.
  "https://images.unsplash.com/photo-1518684079-9d6a3d3a3e9e?auto=format&fit=crop&w=1600&q=60", // Tokyo street
  "https://images.unsplash.com/photo-1508261303677-5f7b0d0b1c6f?auto=format&fit=crop&w=1600&q=60", // Mt Fuji
  "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?auto=format&fit=crop&w=1600&q=60", // Temple lanterns
];

function shortId() {
  return Math.random().toString(36).slice(2, 9);
}

const emptyActivity = () => ({
  id: shortId(),
  title: "",
  timeFrom: "",
  timeTo: "",
  notes: "",
  link: "",
});

export default function JapanItineraryEditor() {
  const [days, setDays] = useState(() => {
    // Load from localStorage or initialize with 1 day
    try {
      const raw = localStorage.getItem("jp_itinerary_v1");
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to load stored itinerary", e);
    }
    return [
      {
        id: shortId(),
        date: "Day 1",
        activities: [emptyActivity()],
      },
    ];
  });
  const [bgIndex, setBgIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [message, setMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("jp_itinerary_v1", JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    const id = setInterval(() => setBgIndex((i) => (i + 1) % JAPAN_IMAGES.length), 8000);
    return () => clearInterval(id);
  }, []);

  const addDay = () => {
    setDays((d) => [...d, { id: shortId(), date: `Day ${d.length + 1}`, activities: [emptyActivity()] }]);
    setSelectedDay(days.length); // select new day
  };

  const removeDay = (index) => {
    if (!confirm("Delete this day?")) return;
    setDays((d) => d.filter((_, i) => i !== index));
    setSelectedDay((s) => Math.max(0, s - 1));
  };

  const updateActivity = (dayIndex, activityId, patch) => {
    setDays((ds) =>
      ds.map((day, di) =>
        di === dayIndex
          ? { ...day, activities: day.activities.map((act) => (act.id === activityId ? { ...act, ...patch } : act)) }
          : day
      )
    );
  };

  const addActivity = (dayIndex) => {
    setDays((ds) =>
      ds.map((day, di) => {
        if (di !== dayIndex) return day;
        if (day.activities.length >= 10) {
          setMessage("Each day is limited to 10 activities.");
          setTimeout(() => setMessage(""), 2500);
          return day;
        }
        return { ...day, activities: [...day.activities, emptyActivity()] };
      })
    );
  };

  const removeActivity = (dayIndex, activityId) => {
    setDays((ds) => ds.map((day, di) => (di === dayIndex ? { ...day, activities: day.activities.filter((a) => a.id !== activityId) } : day)));
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(days, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "japan-itinerary.json";
    a.click();
    URL.revokeObjectURL(href);
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        // basic validation
        if (!Array.isArray(parsed)) throw new Error("Invalid format");
        setDays(parsed);
        setMessage("Itinerary imported successfully.");
        setTimeout(() => setMessage(""), 2500);
      } catch (err) {
        alert("Failed to import JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const isYouTube = (url) => {
    try {
      const u = new URL(url);
      return u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be");
    } catch (e) {
      return false;
    }
  };

  async function fetchAiSuggestions(dayIndex) {
    setAiLoading(true);
    setMessage("");
    try {
      // Attempt to call a server-side AI endpoint. Replace with your own server route.
      const res = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayIndex, date: days[dayIndex]?.date || `Day ${dayIndex + 1}`, context: days }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suggestions)) {
          applyAiSuggestions(dayIndex, data.suggestions);
          setMessage("AI suggestions added (from server).");
          setTimeout(() => setMessage(""), 2500);
          setAiLoading(false);
          return;
        }
      }
    } catch (e) {
      // ignore and fall back
      console.warn("AI endpoint failed, falling back to local suggestions", e);
    }

    // Local fallback suggestions based on day index. Not a real AI.
    const fallback = [
      "Visit a famous shrine or temple",
      "Try a local ramen or sushi restaurant",
      "Stroll through a historic district or shopping street",
      "Visit a museum or art gallery",
      "Take scenic photos at a viewpoint",
    ];
    applyAiSuggestions(dayIndex, fallback.slice(0, 3));
    setMessage("AI suggestions added (local fallback). To use real AI, add a server API at /api/ai-suggest.");
    setTimeout(() => setMessage(""), 3500);
    setAiLoading(false);
  }

  function applyAiSuggestions(dayIndex, suggestions) {
    setDays((ds) =>
      ds.map((day, di) => {
        if (di !== dayIndex) return day;
        const remaining = Math.max(0, 10 - day.activities.length);
        const toAdd = suggestions.slice(0, remaining).map((s) => ({ ...emptyActivity(), title: s }));
        return { ...day, activities: [...day.activities, ...toAdd] };
      })
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center filter brightness-75"
        style={{ backgroundImage: `url(${JAPAN_IMAGES[bgIndex]})` }}
        aria-hidden
      />

      <div className="max-w-7xl mx-auto w-full p-4">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-red-700">Japan Trip Itinerary</h1>
            <p className="text-sm text-white/85">Plan your trip day-by-day • Red & white theme</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportJSON}
              className="px-3 py-2 bg-white/90 text-red-700 rounded shadow-sm hover:opacity-90"
            >
              Export JSON
            </button>
            <label className="px-3 py-2 bg-white/90 text-red-700 rounded shadow-sm cursor-pointer">
              Import
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => e.target.files && importJSON(e.target.files[0])}
              />
            </label>
            <button onClick={addDay} className="px-3 py-2 bg-red-600 text-white rounded shadow-sm">
              + Add Day
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: days list */}
          <aside className="lg:col-span-1 bg-white/90 rounded p-3 shadow">
            <h2 className="font-semibold mb-2 text-red-700">Days</h2>
            <div className="space-y-2">
              {days.map((day, i) => (
                <div
                  key={day.id}
                  className={`p-2 rounded cursor-pointer flex justify-between items-center ${selectedDay === i ? "bg-red-50 border-l-4 border-red-600" : "hover:bg-red-50"}`}
                  onClick={() => setSelectedDay(i)}
                >
                  <div>
                    <div className="font-medium">{day.date}</div>
                    <div className="text-xs text-gray-600">{day.activities.length} activities</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      title="Delete day"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDay(i);
                      }}
                      className="text-sm px-2 py-1 bg-red-50 text-red-700 rounded"
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Editor */}
          <section className="lg:col-span-3 bg-white/95 rounded p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-red-700">{days[selectedDay]?.date || "—"}</h3>
                <div className="text-sm text-gray-600">Edit day activities (max 10)</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchAiSuggestions(selectedDay)}
                  disabled={aiLoading}
                  className="px-3 py-2 bg-red-600 text-white rounded"
                >
                  {aiLoading ? "Suggesting..." : "AI Suggest"}
                </button>
                <button
                  onClick={() => {
                    const copy = JSON.stringify(days[selectedDay], null, 2);
                    navigator.clipboard.writeText(copy);
                    setMessage("Day copied to clipboard (JSON)");
                    setTimeout(() => setMessage(""), 1800);
                  }}
                  className="px-3 py-2 bg-white/90 text-red-700 rounded"
                >
                  Copy Day JSON
                </button>
              </div>
            </div>

            {/* Activities list */}
            <div className="space-y-4">
              {days[selectedDay]?.activities.map((act, ai) => (
                <div key={act.id} className="p-3 border rounded bg-white">
                  <div className="flex items-start gap-3">
                    <div className="w-8 text-sm text-gray-600">{ai + 1}</div>
                    <div className="flex-1">
                      <input
                        className="w-full mb-2 p-2 border rounded"
                        placeholder="Activity title (e.g. Visit Senso-ji)"
                        value={act.title}
                        onChange={(e) => updateActivity(selectedDay, act.id, { title: e.target.value })}
                      />

                      <div className="flex gap-2 mb-2">
                        <input
                          type="time"
                          className="p-2 border rounded"
                          value={act.timeFrom}
                          onChange={(e) => updateActivity(selectedDay, act.id, { timeFrom: e.target.value })}
                        />
                        <input
                          type="time"
                          className="p-2 border rounded"
                          value={act.timeTo}
                          onChange={(e) => updateActivity(selectedDay, act.id, { timeTo: e.target.value })}
                        />
                        <input
                          className="flex-1 p-2 border rounded"
                          placeholder="Link (URL) or YouTube"
                          value={act.link}
                          onChange={(e) => updateActivity(selectedDay, act.id, { link: e.target.value })}
                        />
                      </div>

                      <textarea
                        className="w-full p-2 border rounded mb-2"
                        placeholder="Notes or details"
                        rows={2}
                        value={act.notes}
                        onChange={(e) => updateActivity(selectedDay, act.id, { notes: e.target.value })}
                      />

                      {/* Link preview for YouTube */}
                      {act.link && isYouTube(act.link) && (
                        <div className="mb-2">
                          <div className="text-sm font-medium text-gray-700 mb-1">YouTube preview</div>
                          <div className="aspect-video bg-black/5 rounded overflow-hidden">
                            <iframe
                              title={`yt-${act.id}`}
                              src={convertYouTubeEmbed(act.link)}
                              allowFullScreen
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          {act.timeFrom || act.timeTo ? `${act.timeFrom || "—"} → ${act.timeTo || "—"}` : "No time set"}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              // quick duplicate
                              const newAct = { ...act, id: shortId() };
                              setDays((ds) =>
                                ds.map((d, di) => (di === selectedDay ? { ...d, activities: [...d.activities.slice(0, ai + 1), newAct, ...d.activities.slice(ai + 1)] } : d))
                              );
                            }}
                            className="px-2 py-1 text-xs bg-white/90 rounded"
                          >
                            Dup
                          </button>
                          <button
                            onClick={() => removeActivity(selectedDay, act.id)}
                            className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-2">
                <button onClick={() => addActivity(selectedDay)} className="px-4 py-2 bg-white/90 text-red-700 rounded">
                  + Add Activity
                </button>
                <button
                  onClick={() => setDays((ds) => ds.map((d, i) => (i === selectedDay ? { ...d, activities: [emptyActivity()] } : d)))}
                  className="px-4 py-2 bg-white/90 text-gray-700 rounded"
                >
                  Reset Day
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-6 text-sm text-gray-200 flex items-center justify-between">
          <div className="bg-white/10 p-2 rounded text-white/90">Made with ❤️ — Japan theme (red & white)</div>
          <div className="flex gap-3 items-center">
            {message && <div className="px-3 py-1 bg-white/90 text-red-700 rounded">{message}</div>}
            <div className="text-xs text-white/80">Tip: Add your own AI route at <code className="bg-white/10 px-1 rounded">/api/ai-suggest</code></div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Helper: convert YouTube url to embed url
function convertYouTubeEmbed(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1);
      return `https://www.youtube.com/embed/${id}`;
    }
    if (u.searchParams.has("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
  } catch (e) {
    return "";
  }
  return url;
}
