/**
 * M55 SOUL BINDER (Legacy Receiver)
 * - Receives M55_SOUL_SYNC from parent
 * - Security: strict event.origin check
 * - Binds to window.M55_CURRENT_USER and (optional) window.M55_USER_PROFILE
 */
(function () {
  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin) return;

    var data = event.data;
    if (!data || data.type !== 'M55_SOUL_SYNC') return;

    var payload = data.payload || {};

    window.M55_CURRENT_USER = payload;

    if (payload.profile) {
      window.M55_USER_PROFILE = payload.profile;
      try {
        var evt = new CustomEvent('m55:profile_ready', { detail: payload.profile });
        window.dispatchEvent(evt);
      } catch (_) {}
    }

    try {
      document.body.classList.remove('plan-FREE', 'plan-STANDARD', 'plan-PREMIUM');
      if (payload.plan) document.body.classList.add('plan-' + payload.plan);
    } catch (_) {}

    function bindText(id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text == null ? '' : String(text);
    }

    bindText('user_name_display', payload.user_name || 'Guest');
    bindText('user_plan_display', payload.plan || 'FREE');
    if (payload.profile && payload.profile.birthDate) {
      bindText('user_birth_display', payload.profile.birthDate);
    }
  });
})();