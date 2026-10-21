/**
 * NorthSurvive · assets/global.js
 * Small, dependency-free scripts loaded on every page (with `defer`).
 *
 * <ns-header>  Mega panels (click, hover on desktop, Escape, click outside),
 *              the mobile menu dialog, and the hide-on-scroll sticky header.
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
