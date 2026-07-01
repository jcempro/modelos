((select: ZeptoStatic): void => {
  "use strict";

  const styles = [
    "color_definitions_base__8.css",
    "color_definitions_dark_4_8.css",
    "desktop.css",
    "discourse-adplugin.css",
    "discourse-akismet.css",
    "discourse-assign.css",
    "discourse-cakeday.css",
    "discourse-canned-replies.css",
    "discourse-checklist.css",
    "discourse-data-explorer.css",
    "discourse-details.css",
    "discourse-footnote.css",
    "discourse-local-dates.css",
    "discourse-math.css",
    "discourse-narrative-bot.css",
    "discourse-policy.css",
    "discourse-presence.css",
    "discourse-reactions.css",
    "discourse-solved.css",
    "discourse-spoiler-alert.css",
    "discourse-user-notes.css",
    "discourse-voting.css",
    "hosted-site.css",
    "lazy-yt.css",
    "poll.css",
    "discourse-reactions_desktop.css",
    "discourse-voting_desktop.css",
    "poll_desktop.css",
    "desktop_theme_8.css"
  ];
  const base = "https://sea1.discourse-cdn.com/try/stylesheets/";

  select(styles).each((_index, entry) => {
    select("html").append(`<link href="${base}${entry}" media="all" rel="stylesheet">`);
  });

  select("#ember8").css("display", "none");
})(window.$ as ZeptoStatic);

