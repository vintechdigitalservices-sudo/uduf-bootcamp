/* =========================================================
   UDUF AFRICA — Home page
   Mounts the seven home sections, then hands control to the
   hero so the opening sequence can start after layout settles.
   ========================================================= */
(function (global) {
  'use strict';

  var Uduf = global.Uduf = global.Uduf || {};
  var U = Uduf.util;

  var SECTIONS = [
    { host: '[data-component="hero"]',      build: function (n) { return Uduf.Hero.init(n); } },
    { host: '[data-component="journey"]',   build: function (n) { return Uduf.JourneySection.render(n); } },
    { host: '[data-component="programme"]', build: function (n) { return Uduf.ProgrammeSection.render(n); } },
    { host: '[data-component="experience"]',build: function (n) { return Uduf.ExperienceSection.render(n); } },
    { host: '[data-component="attendees"]', build: function (n) { return Uduf.AttendeesSection.render(n); } },
    { host: '[data-component="details"]',   build: function (n) { return Uduf.EventDetails.render(n); } },
    { host: '[data-component="cta"]',       build: function (n) { return Uduf.Cta.render(n); } }
  ];

  Uduf.pages = Uduf.pages || {};

  Uduf.pages.home = {
    init: function () {
      SECTIONS.forEach(function (s) {
        var host = U.qs(s.host);
        if (!host) return;
        try { s.build(host); }
        catch (e) { if (global.console) console.error('[UDUF] section failed:', s.host, e); }
      });
    }
  };
})(window);
