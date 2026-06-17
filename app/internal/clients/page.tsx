"use client"
import { Building2, Plus } from "lucide-react"

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your client accounts</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Client</button>
      </div>
      <div className="card text-center py-16">
        <Building2 size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 mb-2">Client management coming soon.</p>
        <p className="text-gray-400 text-sm">Add and manage your client companies here.</p>
      </div>
    </div>
  )
}
