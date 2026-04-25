import React, { useState, useEffect, useRef } from 'react'
import {
  Key,
  MapPin,
  Zap,
  ShoppingCart,
  ListChecks,
  Quote,
  MessageCircle,
  RefreshCw,
  Search
} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default Leaflet icon paths in Vite/React
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconRetinaUrl: iconRetina,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function App() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  const actualEnvKey = envKey && envKey.trim() !== '' ? envKey.trim() : null

  const [apiKey, setApiKey] = useState(actualEnvKey || localStorage.getItem('GEMINI_API_KEY') || '')
  const [apiKeySaved, setApiKeySaved] = useState(!!(actualEnvKey || localStorage.getItem('GEMINI_API_KEY')))
  const [tempApiKey, setTempApiKey] = useState('')

  const [location, setLocation] = useState('')
  const [budget, setBudget] = useState('')
  const [victim, setVictim] = useState('Family')

  const [isOrchestrating, setIsOrchestrating] = useState(false)
  const [showResult, setShowResult] = useState(false)

  const [suggestedStore, setSuggestedStore] = useState('')
  const [suggestedAddress, setSuggestedAddress] = useState('')
  const [shoppingList, setShoppingList] = useState([])
  const [aiBackstory, setAiBackstory] = useState('')
  const [selectedCoords, setSelectedCoords] = useState(null)

  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerInstance = useRef(null)

  useEffect(() => {
    if (showResult && selectedCoords && mapRef.current) {
      if (mapInstance.current) {
        mapInstance.current.remove()
      }

      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([selectedCoords.lat, selectedCoords.lng], 16)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstance.current)

      markerInstance.current = L.marker([selectedCoords.lat, selectedCoords.lng]).addTo(mapInstance.current)
        .bindPopup(`<b>${suggestedStore}</b><br>${suggestedAddress}`)
        .openPopup()

        // Fix for blank map issue: Invalidate size after a delay to ensure container is ready
        setTimeout(() => {
          if (mapInstance.current) {
            mapInstance.current.invalidateSize();
          }
        }, 500);
    }
  }, [showResult, selectedCoords, suggestedStore, suggestedAddress])

  const saveApiKey = () => {
    if (tempApiKey) {
      localStorage.setItem('GEMINI_API_KEY', tempApiKey)
      setApiKey(tempApiKey)
      setApiKeySaved(true)
    }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }

    setLocation("Scanning GPS...")

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setSelectedCoords(coords)
        setLocation(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (GPS Active)`)
      },
      (error) => {
        console.error(error)
        alert("Unable to access location. Please type it manually.")
        setLocation("")
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const fetchGeminiData = async (isReroll = false) => {
    if (!apiKey) throw new Error("No API Key")

    const rerollInstruction = isReroll ? `IMPORTANT: Provide a DIFFERENT store than the one you might have suggested previously. Try a more unique or niche local specialty shop.` : ""

    const prompt = `You are a Filipino "Pasalubong" agent. 
    The user forgot to buy pasalubong and is now buying from a shop near ${location} with a budget of ${budget}. 
    The "victims" are ${victim}. 
    
    ${rerollInstruction}
    
    CRITICAL: Avoid generic convenience store chains like 7-Eleven or Uncle John's. 
    Instead, prioritize famous local bakeries (e.g. Goldilocks, Red Ribbon, Conti's) or unique local specialty shops specific to ${location}.
    
    Task: Return a JSON object with:
    1. "storeName": A realistic name of a local bakery or specialty shop in ${location}.
    2. "address": A realistic street address in ${location}.
    3. "lat": Approximate latitude for this store.
    4. "lng": Approximate longitude for this store.
    5. "items": An array of 3 objects, each with "name" and "price" (number).
    6. "script": A funny Taglish script.
    
    Response MUST be valid JSON only. USE DOUBLE QUOTES FOR ALL STRINGS. No markdown, no extra text.
    Example Format: {"storeName": "Name", "address": "Addr", "lat": 14.5, "lng": 121.0, "items": [{"name": "Item", "price": 100}], "script": "Script"}`

    const cleanKey = apiKey.trim()
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      console.error("Gemini API Error details:", errorBody)
      throw new Error(`Gemini API returned ${response.status}: ${errorBody?.error?.message || response.statusText}`)
    }

    const data = await response.json()
    if (!data.candidates || !data.candidates[0].content.parts[0].text) {
      throw new Error("Invalid AI response")
    }

    let text = data.candidates[0].content.parts[0].text
    // Aggressive cleanup for JSON
    text = text.split('```json').pop().split('```').shift().trim()
    
    try {
        return JSON.parse(text)
    } catch (parseErr) {
        console.error("Failed to parse AI response:", text)
        throw new Error("The AI returned a messy response. Please try re-scanning.")
    }
  }

  const orchestrate = async (isReroll = false) => {
    if (!location || !budget) {
      alert("The protocol requires location and budget!")
      return
    }

    setIsOrchestrating(true)
    if (!isReroll) setShowResult(false)

    try {
      const result = await fetchGeminiData(isReroll)

      let finalCoords = { lat: result.lat, lng: result.lng }

      // Try Nominatim for better accuracy
      try {
        const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(result.storeName + ", " + result.address)}`
        const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'PasalubongProtocol/1.0' } })
        const geoData = await geoRes.json()
        if (geoData && geoData.length > 0) {
          finalCoords = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) }
        }
      } catch (geoErr) {
        console.warn("Geocoding failed, using AI estimates", geoErr)
      }

      setSuggestedStore(result.storeName)
      setSuggestedAddress(result.address)
      setAiBackstory(result.script)
      setShoppingList(result.items || [])
      setSelectedCoords(finalCoords)

      // Simulate orchestration delay
      setTimeout(() => {
        setIsOrchestrating(false)
        setShowResult(true)
      }, 2000)

    } catch (e) {
      console.error(e)
      setIsOrchestrating(false)
      alert(`AI Error: ${e.message || "Unknown error"}. Please check your API key and connection.`)
    }
  }

  const reset = () => {
    setShowResult(false)
    setIsOrchestrating(false)
    setLocation('')
    setBudget('')
    setSelectedCoords(null)
  }

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen pb-12 font-inter">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 rounded-full bg-gdg-blue"></div>
              <div className="w-3 h-3 rounded-full bg-gdg-red"></div>
              <div className="w-3 h-3 rounded-full bg-gdg-yellow"></div>
              <div className="w-3 h-3 rounded-full bg-gdg-green"></div>
            </div>
            <h1 className="text-xl font-bold tracking-tight italic">
              Pasalubong<span className="text-red-600">Protocol</span>
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
            SEC-SEED: GDG-MNL-2026
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 mt-8">
        {/* Hero */}
        <section className="text-center mb-10">
          <div className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            🚨 Social Crisis Detected
          </div>
          <h2 className="text-3xl font-extrabold mb-2 tracking-tight">The Procrastinator's Savior</h2>
          <p className="text-slate-500 text-sm">Don't arrive empty-handed. Let the agent handle the shame.</p>
        </section>

        {/* Configuration */}
        {!apiKeySaved && !actualEnvKey && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start space-x-3">
              <Key className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Google Gemini API Key</label>
                <p className="text-[10px] text-blue-400 mb-2 font-medium italic">No Maps API required! Using Leaflet + OSM.</p>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Paste your Gemini API key..."
                  className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={saveApiKey}
                  className="mt-2 text-xs font-bold text-blue-700 underline"
                >
                  Enable Protocol Reasoning
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Section */}
        {!isOrchestrating && !showResult && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 mb-8 relative overflow-hidden">
            <h3 className="font-bold text-lg mb-6 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-gdg-red" />
              Crisis Parameters
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Current Location (Area)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. BGC, NAIA Terminal 3, Makati"
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                  />
                  <button
                    onClick={useMyLocation}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white p-2 rounded-lg border border-slate-100 shadow-sm text-slate-400 hover:text-red-500 hover:border-red-100 transition-all group" title="Use current GPS location"
                  >
                    <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Emergency Budget</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="PHP"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">The "Victim"</label>
                  <select
                    value={victim}
                    onChange={(e) => setVictim(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                  >
                    <option value="Family">Pamilya (Hard Mode)</option>
                    <option value="Office">Office Mates</option>
                    <option value="Date">S.O. / Date</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => orchestrate()}
                className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transform active:scale-95 transition-all shadow-lg flex items-center justify-center space-x-2"
              >
                <Zap className="w-5 h-5" />
                <span>Execute Emergency Protocol</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading Phase (Silent & Minimal) */}
        {isOrchestrating && (
          <div className="bg-slate-900 rounded-2xl shadow-2xl p-8 mb-8 min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
              <div className="w-full h-1 bg-red-500 scan-line absolute top-0"></div>
            </div>
            <RefreshCw className="w-12 h-12 text-red-500 animate-spin" />
            <div className="mt-6 w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-full h-full bg-red-500 animate-[pulse_1.5s_infinite]"></div>
            </div>
          </div>
        )}

        {/* Result Area */}
        {showResult && !isOrchestrating && (
          <div className="space-y-6">

            {/* Store Found */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <h4 className="text-xs font-bold text-green-600 uppercase tracking-tighter">Target Acquired</h4>
                  <div className="flex items-center space-x-2">
                    <p className="text-xl font-black text-slate-800">{suggestedStore}</p>
                    <button onClick={() => setShowResult(false)} className="text-[10px] text-blue-500 font-bold hover:underline">Edit</button>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => orchestrate(true)} 
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors group" 
                    title="Find another shop"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500 group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                  <div className="bg-green-100 p-3 rounded-full">
                    <ShoppingCart className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="flex items-start space-x-2 text-slate-500 text-[10px] md:text-xs mb-1">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span>{suggestedAddress}</span>
                </div>
                <div className="flex space-x-2">
                    <input 
                        type="text" 
                        value={location} 
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Change location..."
                        className="flex-1 text-[10px] bg-slate-50 border border-slate-100 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                    />
                    <button 
                        onClick={() => orchestrate()} 
                        className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded flex items-center"
                    >
                        <Search className="w-3 h-3 mr-1" /> Re-scan
                    </button>
                </div>
              </div>

              {/* Map Container */}
              <div className="mt-4 rounded-xl overflow-hidden border border-slate-100 shadow-inner h-48 bg-slate-100">
                <div id="map" ref={mapRef} className="w-full h-full min-h-[192px] z-10">
                  {/* Map injected here */}
                </div>
              </div>
            </div>

            {/* Shopping List */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center">
                <ListChecks className="w-5 h-5 mr-2 text-gdg-blue" />
                Grab-Ready List
              </h3>
              <ul className="space-y-2">
                {shoppingList.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                    <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mr-3"></div>
                        <span>{typeof item === 'string' ? item : item.name}</span>
                    </div>
                    {item.price && (
                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100">
                            PHP {item.price}
                        </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Backstory */}
            <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-2xl p-8 shadow-xl text-white relative">
              <Quote className="absolute top-4 right-4 w-12 h-12 text-white/10" />
              <h3 className="font-bold text-lg mb-4 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                The "Emotional" Script
              </h3>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 italic text-sm leading-relaxed">
                {aiBackstory}
              </div>
              <div className="mt-4 text-[10px] uppercase font-bold tracking-widest text-white/60">
                Reasoned by Gemini AI (v1.5-flash)
              </div>
            </div>

            <button
              onClick={reset}
              className="w-full py-4 text-slate-400 font-medium hover:text-red-600 transition-colors text-sm"
            >
              Abandon Protocol / Reset
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-slate-400 text-xs px-6">
        <p>© 2026 GDG Manila Build With AI | The Agentic Age</p>
        <p className="mt-1">"Orchestrate the Future. Ship the Agent."</p>
      </footer>
    </div>
  )
}

export default App
