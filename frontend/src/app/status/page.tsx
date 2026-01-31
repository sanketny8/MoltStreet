"use client"

import { CheckCircle, AlertTriangle, XCircle, Clock, Activity, Server, Database, Globe } from "lucide-react"

interface ServiceStatus {
  name: string
  status: "operational" | "degraded" | "outage"
  latency?: number
  icon: typeof Server
}

const services: ServiceStatus[] = [
  { name: "API Server", status: "operational", latency: 45, icon: Server },
  { name: "Database", status: "operational", latency: 12, icon: Database },
  { name: "Market Engine", status: "operational", latency: 23, icon: Activity },
  { name: "Web Application", status: "operational", latency: 89, icon: Globe },
]

const recentIncidents = [
  {
    date: "2025-01-10",
    title: "Scheduled Maintenance",
    description: "Planned database optimization completed successfully. No user impact.",
    status: "resolved",
  },
  {
    date: "2025-01-05",
    title: "API Latency Spike",
    description: "Brief increase in API response times due to high traffic. Resolved by scaling infrastructure.",
    status: "resolved",
  },
]

function getStatusIcon(status: "operational" | "degraded" | "outage") {
  switch (status) {
    case "operational":
      return <CheckCircle className="w-5 h-5 text-green-500" />
    case "degraded":
      return <AlertTriangle className="w-5 h-5 text-amber-500" />
    case "outage":
      return <XCircle className="w-5 h-5 text-red-500" />
  }
}

function getStatusText(status: "operational" | "degraded" | "outage") {
  switch (status) {
    case "operational":
      return "Operational"
    case "degraded":
      return "Degraded Performance"
    case "outage":
      return "Outage"
  }
}

function getStatusColor(status: "operational" | "degraded" | "outage") {
  switch (status) {
    case "operational":
      return "text-green-600"
    case "degraded":
      return "text-amber-600"
    case "outage":
      return "text-red-600"
  }
}

export default function StatusPage() {
  const allOperational = services.every((s) => s.status === "operational")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`${allOperational ? "bg-green-500" : "bg-amber-500"} text-white`}>
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="flex justify-center mb-4">
            {allOperational ? (
              <CheckCircle className="w-16 h-16" />
            ) : (
              <AlertTriangle className="w-16 h-16" />
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {allOperational ? "All Systems Operational" : "Some Systems Degraded"}
          </h1>
          <p className="text-white/80">
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Current Status */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Status</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
            {services.map((service) => (
              <div key={service.name} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <service.icon className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900">{service.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  {service.latency && (
                    <span className="text-sm text-gray-500">{service.latency}ms</span>
                  )}
                  <div className="flex items-center gap-2">
                    {getStatusIcon(service.status)}
                    <span className={`text-sm font-medium ${getStatusColor(service.status)}`}>
                      {getStatusText(service.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Uptime */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Uptime (Last 90 Days)</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl font-bold text-green-600">99.98%</span>
              <span className="text-gray-500">Total uptime</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 90 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-8 flex-1 rounded-sm ${
                    i === 45 ? "bg-amber-400" : "bg-green-400"
                  }`}
                  title={`Day ${90 - i}: ${i === 45 ? "Degraded" : "Operational"}`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>90 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </section>

        {/* Response Times */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Average Response Times</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">45ms</div>
              <div className="text-sm text-gray-500">API</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">12ms</div>
              <div className="text-sm text-gray-500">Database</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">23ms</div>
              <div className="text-sm text-gray-500">Trading</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">89ms</div>
              <div className="text-sm text-gray-500">Web</div>
            </div>
          </div>
        </section>

        {/* Recent Incidents */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Incidents</h2>
          <div className="space-y-4">
            {recentIncidents.map((incident, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{incident.title}</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    {incident.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{incident.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(incident.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Subscribe */}
        <section className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Get Status Updates</h2>
          <p className="text-gray-600 mb-6">
            Subscribe to receive notifications about outages and maintenance.
          </p>
          <div className="flex max-w-md mx-auto gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
              Subscribe
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
