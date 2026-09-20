---
title: Home
sections:
  - type: hero
    heading: "Ship docs that don't look like docs"
    subheading: "The ASIOS website — built with our own engine."
    cta: { label: "Get started", href: "/docs" }
    animate: true
  - type: featureGrid
    heading: "Everything a GitBook site has"
    animate: true
    items:
      - icon: "⚡"
        title: "Instant search"
        body: "Pagefind indexes every page across docs, blog, and marketing — sub-100ms results, zero infrastructure."
      - icon: "🎨"
        title: "On-brand, always"
        body: "One token set drives docs, marketing, and blog — a single accent colour does most of the work."
      - icon: "🚀"
        title: "Static, fast, free"
        body: "No client router, no framework runtime — every page ships as plain HTML with a few small JS islands."
  - type: testimonial
    animate: true
    items:
      - quote: "Reads exactly like GitBook — nobody could tell it wasn't."
        author: "A reviewer"
        role: "on the first mockup pass"
  - type: pricingTable
    heading: "Pricing"
    animate: true
    plans:
      - name: "Docs only"
        price: "$0"
        features:
          - "Documentation template"
          - "Search"
          - "Light/dark theme"
        cta: { label: "Start here", href: "/docs" }
      - name: "Full site"
        price: "$0"
        highlighted: true
        features:
          - "Docs + Marketing + Blog"
          - "Search across all templates"
          - "Feedback widget"
        cta: { label: "Recommended", href: "#get-started" }
      - name: "+ Ask AI"
        price: "~$/mo"
        features:
          - "Everything above"
          - "RAG chat over the content"
          - "Usage-based Claude API cost"
        cta: { label: "Later", href: "#get-started" }
  - type: logoStrip
    heading: "Built on"
    animate: true
    logos:
      - name: "Markdown"
      - name: "Pagefind"
      - name: "Cloudflare Pages"
      - name: "GitHub Pages"
  - type: ctaBanner
    heading: "Ready to try it?"
    id: "get-started"
    cta: { label: "Read the docs", href: "/docs" }
    animate: true
---
