/**
 * NorthSurvive · assets/product.js
 * Loaded only on product pages.
 *
 * <ns-product>          Variant picker, quantity buttons, add to cart
 *                       (Shopify Ajax Cart API with a normal form fallback)
 *                       and the mobile gallery counter.
 * <ns-recommendations>  Loads Shopify's related products after the page.
 *
 * All prices and stock come from Shopify: the variant data is printed by
 * sections/main-product.liquid, so nothing is calculated here.
 */
(function () {
  'use strict';

  class NsProduct extends HTMLElement {
    connectedCallback() {
      var data = this.querySelector('[data-variants]');
      this.variants = data ? JSON.parse(data.textContent) : [];
      this.form = this.querySelector('[data-product-form]');
      this.idInput = this.querySelector('[data-variant-id]');
      this.addButton = this.querySelector('[data-add-button]');
      this.addLabel = this.querySelector('[data-add-label]');
      this.message = this.querySelector('[data-product-message]');

      this.querySelectorAll('[data-option-input]').forEach((input) => {
        input.addEventListener('change', () => this.onOptionChange());
      });
      this.markUnavailable();

      var qty = this.querySelector('.quantity__input');
      var minus = this.querySelector('[data-quantity-minus]');
      var plus = this.querySelector('[data-quantity-plus]');
      if (qty && minus && plus) {
        minus.addEventListener('click', () => { qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) - 1); });
        plus.addEventListener('click', () => { qty.value = (parseInt(qty.value, 10) || 1) + 1; });
      }

      if (this.form) this.form.addEventListener('submit', (event) => this.onSubmit(event));
      this.setupGalleryCounter();
    }

    selectedOptions() {
      return Array.from(this.querySelectorAll('.variant-option')).map((fieldset) => {
        var checked = fieldset.querySelector('[data-option-input]:checked');
        return checked ? checked.value : null;
      });
    }

    onOptionChange() {
      var selected = this.selectedOptions();
      var variant = this.variants.find((v) => v.options.every((value, i) => value === selected[i]));

      this.querySelectorAll('.variant-option').forEach((fieldset, i) => {
        var label = fieldset.querySelector('[data-option-selected]');
        if (label) label.textContent = selected[i] || '';
      });
      this.markUnavailable();

      if (!variant) {
        this.setButton(false, this.dataset.unavailableText);
        return;
      }

      this.idInput.value = variant.id;
      var price = this.querySelector('[data-price]');
      var compare = this.querySelector('[data-compare-price]');
      if (price) price.innerHTML = variant.price;
      if (compare) {
        compare.hidden = !variant.compare;
        if (variant.compare) compare.innerHTML = '<span class="visually-hidden">' + (compare.dataset.label || '') + '</span> ' + variant.compare;
      }

      var availability = this.querySelector('[data-availability]');
      if (availability) {
        availability.classList.toggle('availability--sold-out', !variant.available);
        availability.textContent = variant.available ? availability.dataset.inStockText : availability.dataset.soldOutText;
      }
      this.setButton(variant.available, variant.available ? this.dataset.addText : this.dataset.soldOutText);

      if (variant.media) this.showMedia(variant.media);

      var url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
    }

    // Grey out option values that have no available variant with the other current choices
    markUnavailable() {
      var selected = this.selectedOptions();
      this.querySelectorAll('.variant-option').forEach((fieldset, optionIndex) => {
        fieldset.querySelectorAll('.variant-pill').forEach((pill) => {
          var input = pill.querySelector('input');
          var exists = this.variants.some((v) =>
            v.available &&
            v.options[optionIndex] === input.value &&
            v.options.every((value, i) => i === optionIndex || selected[i] === null || value === selected[i])
          );
          pill.classList.toggle('is-unavailable', !exists);
        });
      });
    }

    setButton(enabled, text) {
      if (!this.addButton) return;
      this.addButton.disabled = !enabled;
      if (this.addLabel && text) this.addLabel.textContent = text;
    }

    showMedia(mediaId) {
      var item = this.querySelector('[data-media-id="' + mediaId + '"]');
      if (!item) return;
      var list = item.parentElement;
      if (window.matchMedia('(max-width: 899px)').matches) {
        list.scrollTo({ left: item.offsetLeft - list.offsetLeft, behavior: 'smooth' });
      } else if (item !== list.firstElementChild) {
        // Desktop: move the variant's image into the large first position
        list.prepend(item);
      }
    }

    async onSubmit(event) {
      if (!window.fetch) return; // old browser: normal form submit to the cart
      event.preventDefault();
      if (this.addButton.disabled) return;

      this.addButton.setAttribute('aria-busy', 'true');
      this.hideMessage();
      try {
        var response = await fetch(window.Shopify && window.Shopify.routes ? window.Shopify.routes.root + 'cart/add.js' : '/cart/add.js', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(this.form)
        });
        var result = await response.json();
        if (!response.ok) throw new Error(result.description || result.message || this.dataset.errorText);

        var cart = await fetch((window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/') + 'cart.js').then((r) => r.json());
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { itemCount: cart.item_count, cart: cart, source: 'product' } }));
        this.showMessage(this.dataset.addedText, false);
      } catch (error) {
        this.showMessage(error.message || this.dataset.errorText, true);
      } finally {
        this.addButton.removeAttribute('aria-busy');
      }
    }

    showMessage(html, isError) {
      if (!this.message) return;
      this.message.innerHTML = html;
      this.message.classList.toggle('is-error', !!isError);
      this.message.hidden = false;
    }

    hideMessage() {
      if (this.message) this.message.hidden = true;
    }

    setupGalleryCounter() {
      var list = this.querySelector('[data-gallery]');
      var current = this.querySelector('[data-gallery-current]');
      if (!list || !current) return;
      var ticking = false;
      list.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          var first = list.firstElementChild;
          var step = first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(list).columnGap || 0) : 1;
          current.textContent = Math.min(list.children.length, Math.round(list.scrollLeft / step) + 1);
          ticking = false;
        });
      }, { passive: true });
    }
  }

  if (!customElements.get('ns-product')) customElements.define('ns-product', NsProduct);

  class NsRecommendations extends HTMLElement {
    connectedCallback() {
      if (!this.dataset.url || this.querySelector('.product-grid')) return;
      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          var html = new DOMParser().parseFromString(text, 'text/html');
          var fresh = html.querySelector('ns-recommendations');
          if (fresh && fresh.querySelector('.product-grid')) {
            this.innerHTML = fresh.innerHTML;
          } else {
            this.hidden = true;
          }
        })
        .catch(() => { this.hidden = true; });
    }
  }

  if (!customElements.get('ns-recommendations')) customElements.define('ns-recommendations', NsRecommendations);
})();
