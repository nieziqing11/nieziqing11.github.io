(function () {
  const splash = document.getElementById("splash");
  const splashIcon = document.getElementById("splashIcon");
  const logo = document.querySelector(".logo");
  const tagline = document.querySelector(".splashTagline");
  if (!splash || !splashIcon || !logo) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    splash.remove();
    document.body.classList.remove("splash-active");
    return;
  }

  logo.classList.add("logo--pending");

  const FULLSCREEN_HOLD_MS = 2000;

  function startShrink() {
    tagline?.classList.add("splashTagline--hide");

    const iconRect = splashIcon.getBoundingClientRect();
    const target = logo.getBoundingClientRect();
    const startRadius = getComputedStyle(splashIcon).borderRadius || "48px";

    splashIcon.classList.add("splashIcon--fly");
    splashIcon.style.left = `${iconRect.left}px`;
    splashIcon.style.top = `${iconRect.top}px`;
    splashIcon.style.width = `${iconRect.width}px`;
    splashIcon.style.height = `${iconRect.height}px`;

    const anim = splashIcon.animate(
      [
        {
          left: `${iconRect.left}px`,
          top: `${iconRect.top}px`,
          width: `${iconRect.width}px`,
          height: `${iconRect.height}px`,
          borderRadius: startRadius
        },
        {
          left: `${target.left}px`,
          top: `${target.top}px`,
          width: `${target.width}px`,
          height: `${target.height}px`,
          borderRadius: "12px"
        }
      ],
      {
        duration: 1000,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards"
      }
    );

    anim.onfinish = () => {
      logo.classList.remove("logo--pending");
      splash.classList.add("splash--done");
      document.body.classList.remove("splash-active");
      window.setTimeout(() => splash.remove(), 220);
    };
  }

  function run() {
    window.setTimeout(startShrink, FULLSCREEN_HOLD_MS);
  }

  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
})();
