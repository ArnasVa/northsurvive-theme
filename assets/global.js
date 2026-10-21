/**
 * NorthSurvive · assets/global.js
 * Small, dependency-free scripts loaded on every page (with `defer`).
 *
 * <ns-header>      Mega panels (click, hover on desktop, Escape, click outside),
 *                  the mobile menu dialog, and the hide-on-scroll sticky header.
 * <ns-tabs>        Tabs in the featured products section.
 * <ns-lights-out>  The pointer-following light in the editorial story section.
 *
 * The page works without JavaScript: links still navigate, and the
 * mobile menu button simply does nothing.
 */

(function () {
  'use strict';

  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

  class NsHeader extends HTMLElement {
    connectedCallback() {
      this.toggles = Array.from(this.querySelectorAll('[data-mega-toggle]'));
      this.openToggle = null;
      this.hoverTimer = null;

      this.toggles.forEach((toggle) => {
        var item = toggle.closest('.site-nav__item');

        toggle.addEventListener('click', () => {
          this.isOpen(toggle) ? this.close() : this.open(toggle);
        });

        // Desktop: open on hover with a short delay, close when the pointer leaves.
        item.addEventListener('pointerenter', () => {
          if (!canHover.matches) return;
          clearTimeout(this.hoverTimer);
          this.hoverTimer = setTimeout(() => this.open(toggle), 120);
        });
        item.addEventListener('pointerleave', () => {
          if (!canHover.matches) return;
          clearTimeout(this.hoverTimer);
          this.hoverTimer = setTimeout(() => this.close(), 220);
        });
      });

      // Close on Escape and return focus to the menu button.
      this.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.openToggle) {
          var toggle = this.openToggle;
          this.close();
          toggle.focus();
        }
      });

      // Close when clicking anywhere outside the header.
      document.addEventListener('click', (event) => {
        if (this.openToggle && !this.contains(event.target)) this.close();
      });

      // Close when keyboard focus leaves the open panel and its button.
      this.addEventListener('focusout', (event) => {
        if (!this.openToggle) return;
        var item = this.openToggle.closest('.site-nav__item');
        if (event.relatedTarget && !item.contains(event.relatedTarget)) this.close();
      });

      this.setupMobileMenu();
      this.setupSticky();
    }

    isOpen(toggle) {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    open(toggle) {
      if (this.openToggle && this.openToggle !== toggle) this.close();
      var panel = document.getElementById(toggle.getAttribute('aria-controls'));
      if (!panel) return;
      toggle.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
      this.openToggle = toggle;
      this.classList.remove('is-hidden');
    }

    close() {
      if (!this.openToggle) return;
      var panel = document.getElementById(this.openToggle.getAttribute('aria-controls'));
      this.openToggle.setAttribute('aria-expanded', 'false');
      if (panel) panel.hidden = true;
      this.openToggle = null;
    }

    setupMobileMenu() {
      var dialog = document.getElementById('MobileMenu');
      var openButton = this.querySelector('[data-mobile-open]');
      if (!dialog || !openButton || typeof dialog.showModal !== 'function') return;

      openButton.addEventListener('click', () => {
        dialog.showModal();
        openButton.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      });

      dialog.querySelectorAll('[data-mobile-close]').forEach((button) => {
        button.addEventListener('click', () => dialog.close());
      });

      // A tap on a link inside the menu should also close it (for #anchors).
      dialog.addEventListener('click', (event) => {
        if (event.target.closest('a')) dialog.close();
      });

      dialog.addEventListener('close', () => {
        openButton.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        openButton.focus();
      });
    }

    setupSticky() {
      if (this.dataset.sticky !== 'scroll-up') return;
      var lastY = window.scrollY;
      var ticking = false;

      window.addEventListener(
        'scroll',
        () => {
          if (ticking) return;
          ticking = true;
          window.requestAnimationFrame(() => {
            var y = window.scrollY;
            var goingDown = y > lastY;
            var pastHeader = y > 200;
            this.classList.toggle('is-hidden', goingDown && pastHeader && !this.openToggle);
            lastY = y;
            ticking = false;
          });
        },
        { passive: true }
      );
    }
  }

  if (!customElements.get('ns-header')) customElements.define('ns-header', NsHeader);

  /**
   * <ns-tabs>  Tabs for the featured products section.
   * Click or use the arrow keys to switch; only the active panel is shown.
   */
  class NsTabs extends HTMLElement {
    connectedCallback() {
      this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
      if (this.tabs.length < 2) return;

      this.tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => this.select(index));
        tab.addEventListener('keydown', (event) => {
          var next = null;
          if (event.key === 'ArrowRight') next = (index + 1) % this.tabs.length;
          if (event.key === 'ArrowLeft') next = (index - 1 + this.tabs.length) % this.tabs.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = this.tabs.length - 1;
          if (next === null) return;
          event.preventDefault();
          this.select(next);
          this.tabs[next].focus();
        });
      });
    }

    select(activeIndex) {
      this.tabs.forEach((tab, index) => {
        var active = index === activeIndex;
        var panel = document.getElementById(tab.getAttribute('aria-controls'));
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
        if (panel) panel.toggleAttribute('data-inactive', !active);
      });
    }
  }

  if (!customElements.get('ns-tabs')) customElements.define('ns-tabs', NsTabs);

  /**
   * <ns-lights-out>  The editorial "Lights Out" moment: the text starts dim
   * and a soft beam lights it up like a torch.
   * - Mouse: the beam follows the pointer.
   * - Touch screens: the beam moves down the text as you scroll (so the
   *   lines light up in reading order), and follows your finger on touch.
   * With reduced motion the text is simply fully lit (CSS, skipped here).
   */
  class NsLightsOut extends HTMLElement {
    connectedCallback() {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || this.classList.contains('is-static') || document.body.classList.contains('no-motion')) {
        this.classList.add('is-static');
        return;
      }
      this.classList.add('is-active');

      if (canHover.matches) {
        this.addEventListener('pointermove', (event) => this.moveTo(event.clientX, event.clientY));
        return;
      }

      this.touching = false;
      this.ticking = false;
      this.onScroll = () => {
        if (this.ticking || this.touching) return;
        this.ticking = true;
        window.requestAnimationFrame(() => {
          this.ticking = false;
          this.followScroll();
        });
      };
      this.addEventListener('touchstart', (event) => {
        this.touching = true;
        var t = event.touches[0];
        this.moveTo(t.clientX, t.clientY);
      }, { passive: true });
      this.addEventListener('touchmove', (event) => {
        var t = event.touches[0];
        this.moveTo(t.clientX, t.clientY);
      }, { passive: true });
      this.addEventListener('touchend', () => { this.touching = false; }, { passive: true });
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
      this.followScroll();
    }

    disconnectedCallback() {
      if (this.onScroll) {
        window.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('resize', this.onScroll);
      }
    }

    moveTo(clientX, clientY) {
      var rect = this.getBoundingClientRect();
      this.style.setProperty('--beam-x', clientX - rect.left + 'px');
      this.style.setProperty('--beam-y', clientY - rect.top + 'px');
    }

    /* The beam sits where the reader's eyes are: about 45% down the screen. */
    followScroll() {
      var rect = this.getBoundingClientRect();
      var eye = window.innerHeight * 0.45;
      var y = Math.min(Math.max(eye - rect.top, rect.height * 0.12), rect.height * 0.88);
      var progress = rect.height ? y / rect.height : 0.5;
      var x = rect.width * (0.35 + 0.3 * Math.sin(progress * Math.PI));
      this.style.setProperty('--beam-x', x + 'px');
      this.style.setProperty('--beam-y', y + 'px');
    }
  }

  if (!customElements.get('ns-lights-out')) customElements.define('ns-lights-out', NsLightsOut);

  /**
   * Variant picker on the product page: reload the page for the chosen
   * variant so price, images and availability always come straight from
   * Shopify (Phase 4 replaces this with an instant update).
   */
  document.addEventListener('change', function (event) {
    var select = event.target.closest('[data-variant-select]');
    if (!select) return;
    var url = new URL(window.location.href);
    url.searchParams.set('variant', select.value);
    window.location.href = url.toString();
  });

  /**
   * Keeps the header cart count in sync. Phase 4's cart drawer dispatches
   * `cart:updated` with the new item count; nothing else needs to change.
   */
  document.addEventListener('cart:updated', function (event) {
    var count = event.detail && typeof event.detail.itemCount === 'number' ? event.detail.itemCount : null;
    if (count === null) return;
    document.querySelectorAll('[data-cart-count]').forEach(function (badge) {
      badge.textContent = count;
      badge.hidden = count === 0;
    });
  });
})();
