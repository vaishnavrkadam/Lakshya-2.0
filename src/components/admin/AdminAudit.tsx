import React, { useState, useEffect } from 'react';
import { getColRef, query, onSnapshot, orderBy } from '../../lib/firebase';
import type { AuditLog } from '../../types/lakshya';
import { History, Shield, Clock, Search } from 'lucide-react';

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const colRef = getColRef('audit_logs');
    // Listen to audit logs
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const items: AuditLog[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // Sort descending by timestamp
      items.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });

      setLogs(items);
      setLoading(false);
    }, (err) => {
      console.error("Failed to load audit logs:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      log.action?.toLowerCase().includes(q) ||
      log.actorEmail?.toLowerCase().includes(q) ||
      log.entityId?.toLowerCase().includes(q) ||
      JSON.stringify(log.metadata || {}).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E8E0D2] pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#6F6A61] block">
            Security & Accountability Ledger
          </span>
          <h2 className="text-2xl font-serif font-bold text-[#171717]">Administrative Audit Trail</h2>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#6F6A61] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit action, actor or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FAF7F2] border border-[#CFC6B6] rounded-lg text-xs font-medium text-[#171717] focus:outline-none focus:border-[#171717]"
          />
        </div>
      </div>

      <div className="bg-[#FAF7F2] border border-[#CFC6B6] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-[#6F6A61]">
            Loading audit trail...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <History className="w-8 h-8 text-[#6F6A61] mx-auto opacity-50" />
            <p className="font-serif text-lg text-[#171717]">No audit entries found</p>
            <p className="text-xs text-[#6F6A61]">Administrative actions will record here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E8E0D2] border-b border-[#CFC6B6] font-mono text-[#6F6A61] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Vertical</th>
                  <th className="py-3 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D2] font-mono text-[11px]">
                {filteredLogs.map((log) => {
                  const dateStr = log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : new Date().toLocaleString();

                  return (
                    <tr key={log.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="py-2.5 px-4 text-[#6F6A61] whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded font-semibold ${
                          log.action === 'MANUAL_ALLOCATION'
                            ? 'bg-purple-100 text-purple-800'
                            : log.action === 'CHECK_IN'
                            ? 'bg-[#315D4C]/15 text-[#315D4C]'
                            : log.action === 'CHECK_IN_DUPLICATE_ATTEMPT'
                            ? 'bg-amber-100 text-amber-800 font-bold'
                            : log.action === 'SCORE_UPDATED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-[#E8E0D2] text-[#171717]'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#171717] font-semibold">
                        {log.actorEmail}
                      </td>
                      <td className="py-2.5 px-4 text-[#6F6A61]">
                        {log.vertical || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-[#6F6A61] max-w-xs truncate">
                        {JSON.stringify(log.metadata || {})}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
