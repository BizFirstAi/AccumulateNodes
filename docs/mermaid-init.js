/* ================================================================
   AccumulateNodes documentation site — shared Mermaid dark theme
   Loaded after the Mermaid library; call ACC_MERMAID_INIT() once
   per page, after the page's own .mermaid blocks are in the DOM.
   ================================================================ */

function ACC_MERMAID_INIT() {
  if (typeof mermaid === "undefined") return;

  mermaid.initialize({
    startOnLoad: true,
    theme: "dark",
    securityLevel: "loose",
    fontFamily: "Inter, system-ui, sans-serif",
    themeVariables: {
      darkMode: true,
      background: "#080F08",
      primaryColor: "#172017",
      primaryTextColor: "#F0FDF4",
      primaryBorderColor: "#16A34A",
      secondaryColor: "#0C150C",
      secondaryTextColor: "#D1FAE5",
      tertiaryColor: "#0C150C",
      tertiaryTextColor: "#86EFAC",
      lineColor: "#22C55E",
      textColor: "#D1FAE5",
      mainBkg: "#172017",
      nodeBorder: "#16A34A",
      clusterBkg: "#0C150C",
      clusterBorder: "rgba(22,163,74,0.35)",
      edgeLabelBackground: "#0C150C",
      actorBkg: "#172017",
      actorBorder: "#16A34A",
      actorTextColor: "#F0FDF4",
      actorLineColor: "rgba(22,163,74,0.4)",
      signalColor: "#22C55E",
      signalTextColor: "#D1FAE5",
      labelBoxBkgColor: "#172017",
      labelBoxBorderColor: "#16A34A",
      labelTextColor: "#F0FDF4",
      loopTextColor: "#86EFAC",
      noteBkgColor: "#1E2B1E",
      noteBorderColor: "rgba(22,163,74,0.4)",
      noteTextColor: "#D1FAE5",
      activationBkgColor: "#1E2B1E",
      activationBorderColor: "#16A34A",
      sequenceNumberColor: "#080F08",
      fontSize: "14px"
    },
    flowchart: { curve: "basis", htmlLabels: true, padding: 12, useMaxWidth: false, nodeSpacing: 46, rankSpacing: 60 },
    sequence: { actorMargin: 60, messageMargin: 34, boxMargin: 10, mirrorActors: false, useMaxWidth: false }
  });

  mermaid.run({ querySelector: ".mermaid" });
}

document.addEventListener("DOMContentLoaded", function () {
  ACC_MERMAID_INIT();
});
