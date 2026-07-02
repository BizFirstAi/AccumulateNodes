/* ================================================================
   AccumulateNodes documentation site — shared header + sidebar nav
   Injects into <div id="site-header"></div> and <aside id="sidebar-nav">
   Set `window.CURRENT_PAGE = "<slug>.html"` before this script runs.
   All icons are hand-authored inline SVG — no icon fonts, no emoji.
   ================================================================ */

(function () {
  "use strict";

  var LOGO_PRIMARY = "https://www.bizfirstai.com/website/images/logo.png";
  var LOGO_FALLBACK = "https://bizfirstai.com/website/assets/Logo/logo-m.png";

  /* ── Icon set (24x24 viewBox, stroke-based, currentColor) ──── */
  var ICONS = {
    home:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9"/></svg>',
    identity:
      '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="8.2" r="3.2"/><path d="M12 3.2v1.6M12 19.2v1.6M12 11.4a7 7 0 0 1 7 7"/><path d="M12 11.4a7 7 0 0 0-7 7"/></svg>',
    tokenAccount:
      '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2.2"/><path d="M3 10h18"/><circle cx="17" cy="14.3" r="1.4"/></svg>',
    dataAccount:
      '<svg class="icon" viewBox="0 0 24 24"><ellipse cx="12" cy="5.2" rx="7.5" ry="2.6"/><path d="M4.5 5.2v6.4c0 1.44 3.36 2.6 7.5 2.6s7.5-1.16 7.5-2.6V5.2"/><path d="M4.5 11.6V18c0 1.44 3.36 2.6 7.5 2.6s7.5-1.16 7.5-2.6v-6.4"/></svg>',
    keyManagement:
      '<svg class="icon" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12.2 19 4.2M16 6l2 2M19.2 3.8l1.6 1.6"/></svg>',
    smartSigner:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M4 19.5c3-.4 3-3.4 0-3.6M4 19.5 15.5 8a1.8 1.8 0 0 0 0-2.6l-.9-.9a1.8 1.8 0 0 0-2.6 0L4 12.9v6.6Z"/><path d="M11.2 5.7 16.3 10.8"/><path d="M17.5 15.5h3.5M17.5 18.5h3.5"/></svg>',
    credits:
      '<svg class="icon" viewBox="0 0 24 24"><circle cx="9" cy="9" r="5.5"/><circle cx="15" cy="15" r="5.5"/><path d="M9 6.6v4.8M6.6 9h4.8" stroke-width="1.4"/></svg>',
    queryExplorer:
      '<svg class="icon" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.3 15.3 21 21"/></svg>',
    utility:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M14.7 6.3a3.8 3.8 0 0 1-4.9 4.9L4.4 16.6a1.9 1.9 0 0 0 2.7 2.7l5.4-5.4a3.8 3.8 0 0 1 4.9-4.9l-2.6 2.6-1.9-.6-.6-1.9 2.6-2.6Z"/></svg>',
    triggers:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3v3.2M12 17.8V21M4.2 12H7.5M16.5 12h3.3"/><circle cx="12" cy="12" r="4.4"/></svg>',
    github:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.4c0-1 .3-1.6.7-2-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.4-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11 11 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.9 1.2 2 1.2 3.2 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2V21"/></svg>',
    externalLink:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M9 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/><path d="M14 4h6v6M20 4 11 13"/></svg>',
    menu:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/></svg>',
    close:
      '<svg class="icon" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19"/></svg>'
  };

  var RESOURCES = [
    { slug: "resource-identity.html", icon: "identity", label: "Identity (ADI)", code: "ID" },
    { slug: "resource-token-account.html", icon: "tokenAccount", label: "Token Account", code: "TA" },
    { slug: "resource-data-account.html", icon: "dataAccount", label: "Data Account", code: "DA" },
    { slug: "resource-key-management.html", icon: "keyManagement", label: "Key Management", code: "KM" },
    { slug: "resource-smart-signer.html", icon: "smartSigner", label: "SmartSigner", code: "SS" },
    { slug: "resource-credits.html", icon: "credits", label: "Credits", code: "CR" },
    { slug: "resource-query-explorer.html", icon: "queryExplorer", label: "Query / Explorer", code: "QX" },
    { slug: "resource-utility.html", icon: "utility", label: "Utility (testnet)", code: "UT" },
    { slug: "resource-triggers.html", icon: "triggers", label: "Triggers", code: "TRIG" }
  ];

  var DISCUSSIONS_URL = "https://github.com/BizFirstAi/AccumulateNodes/discussions";

  function buildHeader() {
    var el = document.getElementById("site-header");
    if (!el) return;
    el.innerHTML =
      '<div class="site-header__inner">' +
        '<div style="display:flex;align-items:center;gap:1rem;">' +
          '<button class="menu-toggle" id="navMenuToggle" aria-label="Toggle navigation">' + ICONS.menu + "</button>" +
          '<a class="brand" href="index.html">' +
            '<img class="brand__logo" src="' + LOGO_PRIMARY + '" alt="BizFirst logo" ' +
              'onerror="this.onerror=null;this.src=\'' + LOGO_FALLBACK + '\';" />' +
            '<span class="brand__text">' +
              '<span class="brand__name">AccumulateNodes</span>' +
              '<span class="brand__tagline">BizFirst &times; Accumulate ExecutionNodes</span>' +
            "</span>" +
          "</a>" +
        "</div>" +
        '<div class="header-actions">' +
          '<span class="status-pill"><span class="status-pill__dot"></span>Design phase — draft</span>' +
          '<a class="btn" href="' + DISCUSSIONS_URL + '" target="_blank" rel="noopener">' +
            ICONS.github + "<span>Discussions</span>" +
          "</a>" +
        "</div>" +
      "</div>";

    var toggle = document.getElementById("navMenuToggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var sb = document.getElementById("sidebar-nav");
        if (sb) sb.classList.toggle("is-open");
      });
    }
  }

  function buildSidebar() {
    var el = document.getElementById("sidebar-nav");
    if (!el) return;
    var current = window.CURRENT_PAGE || "";

    var homeActive = current === "index.html" ? " is-active" : "";
    var html = '<div class="sidebar__group-label">Overview</div>';
    html += '<ul class="sidebar__nav"><li><a class="sidebar__link' + homeActive + '" href="index.html">' +
      ICONS.home + "<span>Home</span></a></li></ul>";

    html += '<div class="sidebar__group-label">Resources (9)</div><ul class="sidebar__nav">';
    RESOURCES.forEach(function (r) {
      var active = current === r.slug ? " is-active" : "";
      html += '<li><a class="sidebar__link' + active + '" href="' + r.slug + '">' +
        ICONS[r.icon] + "<span>" + r.label + "</span>" +
        '<span class="sidebar__code">' + r.code + "</span></a></li>";
    });
    html += "</ul>";

    html += '<div class="sidebar__foot">Every resource/operation on this site is sourced verbatim ' +
      "from <code>00_NodeDesignProposal.md</code> — nothing here is invented. " +
      '<a href="' + DISCUSSIONS_URL + '" target="_blank" rel="noopener">Join the design discussion &rarr;</a></div>';

    el.innerHTML = html;
  }

  function buildFooter() {
    var el = document.getElementById("site-footer");
    if (!el) return;
    el.innerHTML =
      '<div class="site-footer__inner">' +
        '<div class="site-footer__copy">AccumulateNodes — a community project for the BizFirst workflow platform. ' +
          "SDK by <a href=\"https://www.nuget.org/profiles/jason_gregoire\" target=\"_blank\" rel=\"noopener\">jason_gregoire</a>.</div>" +
        '<div class="site-footer__links">' +
          '<a href="index.html">Home</a>' +
          '<a href="' + DISCUSSIONS_URL + '" target="_blank" rel="noopener">GitHub Discussions</a>' +
          '<a href="https://www.nuget.org/packages/Acme.Net.Sdk" target="_blank" rel="noopener">Acme.Net.Sdk</a>' +
          '<a href="https://accumulate.org" target="_blank" rel="noopener">Accumulate Protocol</a>' +
        "</div>" +
      "</div>";
  }

  window.ACC_ICONS = ICONS;
  window.ACC_RESOURCES = RESOURCES;

  document.addEventListener("DOMContentLoaded", function () {
    buildHeader();
    buildSidebar();
    buildFooter();
  });
})();
