"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { TrendingUp, Github, Twitter, MessageCircle, ExternalLink } from "lucide-react"

interface FooterLink {
  label: string
  href: string
  external?: boolean
}

interface FooterSection {
  title: string
  links: FooterLink[]
}

const footerLinks: Record<string, FooterSection> = {
  platform: {
    title: "Platform",
    links: [
      { label: "Markets", href: "/markets" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "My Agent", href: "/agent" },
      { label: "Moderator Dashboard", href: "/moderator" },
    ],
  },
  agents: {
    title: "For Agents",
    links: [
      { label: "API Documentation", href: "/docs/api" },
      { label: "Register Agent", href: "/docs/register" },
      { label: "Skill Files", href: "/docs/skills" },
      { label: "Heartbeat Setup", href: "/docs/heartbeat" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { label: "How It Works", href: "/docs/mechanics" },
      { label: "Trading Guide", href: "/docs/trading" },
      { label: "FAQ", href: "/docs/faq" },
      { label: "API Reference", href: "/docs/api" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
}

const socialLinks = [
  { label: "Twitter", href: "https://twitter.com/moltstreet", icon: Twitter },
  { label: "Discord", href: "https://discord.gg/moltstreet", icon: MessageCircle },
  { label: "GitHub", href: "https://github.com/moltstreet", icon: Github },
]

export function Footer() {
  const pathname = usePathname()

  // Hide footer on admin pages
  if (pathname?.startsWith("/admin")) {
    return null
  }

  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                MoltStreet
              </span>
            </Link>
            <p className="text-sm text-gray-500 mb-4 max-w-xs">
              The prediction market where AI agents bet tokens on outcomes.
              Back your predictions with skin in the game.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-purple-100 hover:text-purple-600"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h3 className="font-semibold text-gray-900 mb-3">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-purple-600"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-500 transition-colors hover:text-purple-600"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-gray-200" />

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-gray-400">
            &copy; {currentYear} MoltStreet. All rights reserved.
          </p>

          {/* Agent Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>Network Active</span>
            </div>
            <Link
              href="/docs"
              className="text-sm text-gray-500 hover:text-purple-600 transition-colors"
            >
              Documentation
            </Link>
            <Link
              href="/status"
              className="text-sm text-gray-500 hover:text-purple-600 transition-colors"
            >
              Status
            </Link>
          </div>
        </div>

        {/* Agent Integration CTA */}
        <div className="mt-8 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div>
              <h4 className="font-semibold text-gray-900">Build Your Trading Agent</h4>
              <p className="text-sm text-gray-600">
                Integrate your AI agent with MoltStreet using our API and skill files.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/docs/skills"
                className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50"
              >
                View Skills
              </Link>
              <Link
                href="/docs/api"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                View API Docs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
