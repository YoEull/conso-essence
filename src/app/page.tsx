"use client";

import { useEffect, useState } from "react";
import {
  Vehicle,
  Station,
  Fill,
  getVehicles,
  getStations,
  getFills,
  upsertVehicle,
  upsertStation,
  addFill,
} from "@/lib/data";

export default function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [fills, setFills] = useState<Fill[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | "">("");
  const [mileage, setMileage] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [liters, setLiters] = useState("");
  const [selectedStationId, setSelectedStationId] = useState<number | "">("");

  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState("");
  const [showNewStation, setShowNewStation] = useState(false);
  const [newStationName, setNewStationName] = useState("");
  const [findingStation, setFindingStation] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [v, s, f] = await Promise.all([getVehicles(), getStations(), getFills()]);
      setVehicles(v);
      setStations(s);
      setFills(f);
    } catch (e) {
      alert("Erreur de chargement : " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const lastVehicleId = localStorage.getItem("lastVehicleId");
    if (lastVehicleId) setSelectedVehicleId(Number(lastVehicleId));
  }, []);

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "new") {
      setShowNewVehicle(true);
      setSelectedVehicleId("");
    } else {
      const id = Number(value);
      setSelectedVehicleId(id);
      setShowNewVehicle(false);
      localStorage.setItem("lastVehicleId", String(id));
    }
  };

  const addNewVehicle = async () => {
    const name = newVehicleName.trim();
    if (!name) return;
    try {
      const vehicle = await upsertVehicle(name);
      setVehicles((prev) => (prev.some((v) => v.id === vehicle.id) ? prev : [...prev, vehicle]));
      setSelectedVehicleId(vehicle.id);
      localStorage.setItem("lastVehicleId", String(vehicle.id));
      setNewVehicleName("");
      setShowNewVehicle(false);
    } catch (e) {
      alert("Erreur : " + (e as Error).message);
    }
  };

  const handleStationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "new") {
      setShowNewStation(true);
      setSelectedStationId("");
    } else if (value === "find") {
      findNearestStation();
    } else {
      setSelectedStationId(Number(value));
      setShowNewStation(false);
    }
  };

  const addNewStation = async () => {
    const name = newStationName.trim();
    if (!name) return;
    try {
      const station = await upsertStation(name);
      setStations((prev) => (prev.some((s) => s.id === station.id) ? prev : [...prev, station]));
      setSelectedStationId(station.id);
      setNewStationName("");
      setShowNewStation(false);
    } catch (e) {
      alert("Erreur : " + (e as Error).message);
    }
  };

  const findNearestStation = async () => {
    setFindingStation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const { latitude, longitude } = position.coords;
      const name = `Station (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      const station = await upsertStation(name);
      setStations((prev) => (prev.some((s) => s.id === station.id) ? prev : [...prev, station]));
      setSelectedStationId(station.id);
    } catch {
      alert("Impossible d'obtenir votre position.");
    } finally {
      setFindingStation(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVehicleId || !mileage || !pricePerLiter || !liters || !selectedStationId) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      await addFill({
        vehicle_id: Number(selectedVehicleId),
        station_id: Number(selectedStationId),
        mileage: parseFloat(mileage),
        price_per_liter: parseFloat(pricePerLiter),
        liters: parseFloat(liters),
        total_cost: Number((parseFloat(pricePerLiter) * parseFloat(liters)).toFixed(2)),
      });

      setMileage("");
      setPricePerLiter("");
      setLiters("");
      setSelectedStationId("");

      await loadData();
    } catch (e) {
      alert("Erreur : " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const totalCost =
    pricePerLiter && liters ? (parseFloat(pricePerLiter) * parseFloat(liters)).toFixed(2) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Suivi Essence</h1>
            <button onClick={loadData} disabled={loading} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200">
              <span className={loading ? "inline-block animate-spin" : ""}>↻</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Véhicule</label>
              {!showNewVehicle ? (
                <select
                  value={selectedVehicleId}
                  onChange={handleVehicleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                >
                  <option value="">Sélectionner un véhicule</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                  <option value="new">+ Ajouter un véhicule</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newVehicleName}
                    onChange={(e) => setNewVehicleName(e.target.value)}
                    placeholder="Nom du véhicule"
                    className="flex-1 px-4 py-3 border rounded-lg"
                  />
                  <button onClick={addNewVehicle} className="px-4 py-3 bg-indigo-600 text-white rounded-lg">
                    ✓
                  </button>
                  <button onClick={() => setShowNewVehicle(false)} className="px-4 py-3 bg-gray-300 rounded-lg">
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kilométrage (km)</label>
              <input
                type="number"
                inputMode="numeric"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="Ex: 45000"
                className="w-full px-4 py-3 border rounded-lg"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prix par litre (€)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.001"
                value={pricePerLiter}
                onChange={(e) => setPricePerLiter(e.target.value)}
                placeholder="Ex: 1.65"
                className="w-full px-4 py-3 border rounded-lg"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de litres (L)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="Ex: 45.5"
                className="w-full px-4 py-3 border rounded-lg"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Station</label>
              {!showNewStation ? (
                <select
                  value={selectedStationId}
                  onChange={handleStationChange}
                  className="w-full px-4 py-3 border rounded-lg"
                  disabled={findingStation || loading}
                >
                  <option value="">Sélectionner une station</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="new">+ Ajouter une station</option>
                  <option value="find">📍 Trouver ma station</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStationName}
                    onChange={(e) => setNewStationName(e.target.value)}
                    placeholder="Nom de la station"
                    className="flex-1 px-4 py-3 border rounded-lg"
                  />
                  <button onClick={addNewStation} className="px-4 py-3 bg-indigo-600 text-white rounded-lg">
                    ✓
                  </button>
                  <button onClick={() => setShowNewStation(false)} className="px-4 py-3 bg-gray-300 rounded-lg">
                    ✕
                  </button>
                </div>
              )}
            </div>

            {totalCost && (
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Coût total</p>
                <p className="text-2xl font-bold text-indigo-600">{totalCost} €</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>

        {fills.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Dernières entrées</h2>
            <div className="space-y-3">
              {fills.map((fill) => (
                <div key={fill.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{fill.vehicles?.name}</p>
                      <p className="text-sm text-gray-600">{fill.stations?.name}</p>
                      <p className="text-xs text-gray-500">{new Date(fill.date).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-indigo-600">{fill.total_cost} €</p>
                      <p className="text-xs text-gray-500">{fill.liters}L</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
