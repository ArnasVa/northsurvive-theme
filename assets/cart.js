/**
 * NorthSurvive · assets/cart.js
 * Loaded on every page.
 *
 * <ns-cart>  Used by the side cart (sections/cart-drawer.liquid) and the cart
 *            page (sections/main-cart.liquid). Quantity changes and removals
 *            go to Shopify's Ajax Cart API; the section HTML that comes back
 *            replaces the old contents, so every price is Shopify's own.
 *
 * Also: the header cart icon opens the side cart, "Į krepšelį" buttons on
 * product cards add without leaving the page, and any `cart:updated` event
 * from the product page refreshes and opens the side cart.
 */
(function () {
  'use strict';

  var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

  function allCarts() {
    return Array.from(document.querySelectorAll('ns-cart'));
  }

  function sectionIds() {
    return allCarts().map(function (cart) { return cart.dataset.sectionId; });
  }

  function renderSections(sections) {
    allCarts().forEach(function (cart) { cart.render(sections && sections[cart.dataset.sectionId]); });
  }

  function announce(itemCount) {
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { itemCount: itemCount, source: 'cart' } }));
  }

  class NsCart extends HTMLElement {
    connectedCallback() {
      this.isDrawer = this.hasAttribute('data-drawer');
      if (this.isDrawer) window.nsCartDrawer = this;

      this.addEventListener('click', (event) => {
        var qtyButton = event.target.closest('[data-cart-qty]');
        if (qtyButton) {
          var item = qtyButton.closest('[data-line]');
          var input = item.querySelector('[data-cart-input]');
          var next = Math.max(0, (parseInt(input.value, 10) || 0) + parseInt(qtyButton.dataset.cartQty, 10));
          this.change(item.dataset.line, next);
          return;
        }
        var remove = event.target.closest('[data-cart-remove]');
        if (remove) {
          event.preventDefault();
          this.change(remove.closest('[data-line]').dataset.line, 0);
          return;
        }
        if (event.target.closest('[data-cart-close]')) this.close();
      });

      this.addEventListener('change', (event) => {
        var input = event.target.closest('[data-cart-input]');
        if (!input) return;
        this.change(input.closest('[data-line]').dataset.line, Math.max(0, parseInt(input.value, 10) || 0));
      });

      if (this.isDrawer) {
        this.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') this.close();
          if (event.key === 'Tab') this.trapFocus(event);
        });
      }
    }

    async change(line, quantity) {
      var item = this.querySelector('[data-line="' + line + '"]');
      if (item) item.classList.add('is-updating');
      try {
        var response = await fetch(root + 'cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ line: Number(line), quantity: quantity, sections: sectionIds() })
        });
        var data = await response.json();
        if (!response.ok || data.status) throw new Error(data.description || data.message);
        renderSections(data.sections);
        announce(data.item_count);
      } catch (error) {
        if (item) item.classList.remove('is-updating');
        this.showError(error.message);
      }
    }

    async refresh() {
      var ids = sectionIds();
      if (!ids.length) return;
      var sections = await fetch(root + '?sections=' + ids.join(',')).then((r) => r.json());
      renderSections(sections);
    }

    render(html) {
      if (!html) return;
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var freshRoot = doc.querySelector('[data-cart-root]');
      var currentRoot = this.querySelector('[data-cart-root]');
      if (freshRoot && currentRoot) currentRoot.innerHTML = freshRoot.innerHTML;
      var freshCount = doc.querySelector('[data-cart-drawer-count]');
      var currentCount = this.querySelector('[data-cart-drawer-count]');
      if (freshCount && currentCount) currentCount.replaceWith(freshCount);
      var freshHead = doc.querySelector('.cart-page__head');
      var currentHead = this.querySelector('.cart-page__head');
      if (freshHead && currentHead) currentHead.replaceWith(freshHead);
    }

    showError(message) {
      var box = this.querySelector('[data-cart-error]');
      if (!box) return;
      box.textContent = message || '';
      box.hidden = !message;
    }

    open() {
      if (!this.isDrawer) return;
      this.lastFocus = document.activeElement;
      this.hidden = false;
      this.offsetWidth; // let the browser apply the start state before animating
      this.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      var panel = this.querySelector('.cart-drawer__panel');
      if (panel) panel.focus();
    }

    close() {
      if (!this.isDrawer || this.hidden) return;
      this.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => { if (!this.classList.contains('is-open')) this.hidden = true; }, 360);
      if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus();
    }

    trapFocus(event) {
      var focusable = Array.from(this.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }

  if (!customElements.get('ns-cart')) customElements.define('ns-cart', NsCart);

  // Header cart icon opens the side cart
  document.addEventListener('click', function (event) {
    var link = event.target.closest('#HeaderCart');
    if (!link || !window.nsCartDrawer) return;
    event.preventDefault();
    window.nsCartDrawer.open();
    window.nsCartDrawer.refresh();
  });

  // Something was added (product page or a quick-add button): refresh and open
  document.addEventListener('cart:updated', function (event) {
    var source = event.detail && event.detail.source;
    if (!window.nsCartDrawer || (source !== 'product' && source !== 'quick-add')) return;
    event.detail.openedDrawer = true;
    window.nsCartDrawer.refresh().then(function () { window.nsCartDrawer.open(); });
  });

  // "Į krepšelį" on product cards: add without leaving the page
  document.addEventListener('submit', async function (event) {
    var form = event.target.closest('.product-card__form');
    if (!form || !window.nsCartDrawer || !window.fetch) return;
    event.preventDefault();
    var button = form.querySelector('button');
    if (button) button.setAttribute('aria-busy', 'true');
    try {
      var response = await fetch(root + 'cart/add.js', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      if (!response.ok) throw new Error();
      var cart = await fetch(root + 'cart.js').then((r) => r.json());
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { itemCount: cart.item_count, source: 'quick-add' } }));
    } catch (error) {
      form.submit();
    } finally {
      if (button) button.removeAttribute('aria-busy');
    }
  });
})();
