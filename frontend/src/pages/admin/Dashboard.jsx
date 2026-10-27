import { useEffect, useState } from "react";
import { getAdminDisputes, resolveDispute } from "../../lib/api";

export default function AdminDashboard() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal state
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [note, setNote] = useState("");
  const [action, setAction] = useState("resolved");
  const [submitting, setSubmitting] = useState(false);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      const data = await getAdminDisputes("open");
      setDisputes(data.disputes);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!selectedDispute) return;
    
    try {
      setSubmitting(true);
      await resolveDispute(selectedDispute._id, action, note);
      setSelectedDispute(null);
      setNote("");
      loadDisputes(); // refresh the list
    } catch (err) {
      alert(err.response?.data?.error || "Failed to resolve dispute");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Admin Dashboard</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Open Disputes</h2>
          <button 
            onClick={loadDisputes}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading disputes...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : disputes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No open disputes! Everything is peaceful.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {disputes.map((d) => (
              <li key={d._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {d.jobId?.description || "Unknown Job"}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium text-gray-700">Raised by:</span> {d.raisedBy?.name} ({d.raisedBy?.role}) <br/>
                      <span className="font-medium text-gray-700">Against:</span> {d.against?.name} ({d.against?.role})
                    </p>
                    <div className="mt-3 bg-red-50 text-red-800 p-3 rounded-md text-sm border border-red-100">
                      <span className="font-semibold block mb-1">Reason:</span>
                      {d.reason}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDispute(d)}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
                  >
                    Review & Resolve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Resolve Dispute</h2>
            
            <form onSubmit={handleResolve}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" value="resolved" checked={action === "resolved"} onChange={(e) => setAction(e.target.value)} />
                    <span>Resolve (Favor)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" value="dismissed" checked={action === "dismissed"} onChange={(e) => setAction(e.target.value)} />
                    <span>Dismiss (No action)</span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Note</label>
                <textarea
                  required
                  minLength={3}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Explain your decision to both parties..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}