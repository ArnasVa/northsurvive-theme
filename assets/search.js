/**
 * NorthSurvive · assets/search.js
 * <ns-search>  The search panel under the header. Opens from any element
 * with [data-search-open]; shows Shopify's predictive search suggestions
 * while typing (sections/predictive-search.liquid). Enter goes to the
 * full search page.
 */
(function () {
  'use strict';

  var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

  class NsSearch extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('[data-search-input]');
      this.results = this.querySelector('[data-search-results]');
      this.timer = null;
      this.controller = null;

      this.input.addEventListener('input', () => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.suggest(), 250);
      });
      this.addEventListener('click', (event) => {
        if (event.target.closest('[data-search-close]')) this.close();
      });
      this.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') this.close();
      });

      document.addEventListener('click', (event) => {
        var opener = event.target.closest('[data-search-open]');
        if (!opener) return;
        event.preventDefault();
        var menu = document.getElementById('MobileMenu');
        if (menu && menu.open) menu.close();
        this.open(opener);
      });
    }

    open(opener) {
      this.opener = opener;
      this.hidden = false;
      this.offsetWidth;
      this.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      this.input.focus();
    }

    close() {
      this.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => { if (!this.classList.contains('is-open')) this.hidden = true; }, 260);
      if (this.opener && this.opener.focus) this.opener.focus();
    }

    async suggest() {
      var terms = this.input.value.trim();
      if (terms.length < 2) {
        this.results.innerHTML = '';
        return;
      }
      if (this.controller) this.controller.abort();
      this.controller = new AbortController();
      var url = root + 'search/suggest?q=' + encodeURIComponent(terms) +
        '&section_id=predictive-search&resources[type]=product,collection,article,page&resources[limit]=6&resources[options][unavailable_products]=last';
      try {
        var text = await fetch(url, { signal: this.controller.signal }).then((r) => r.text());
        var doc = new DOMParser().parseFromString(text, 'text/html');
        var fresh = doc.querySelector('[data-predictive-results]');
        this.results.innerHTML = fresh ? fresh.outerHTML : '';
      } catch (error) {
        if (error.name !== 'AbortError') this.results.innerHTML = '';
      }
    }
  }

  if (!customElements.get('ns-search')) customElements.define('ns-search', NsSearch);
})();
