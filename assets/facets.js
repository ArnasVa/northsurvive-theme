/**
 * NorthSurvive · assets/facets.js
 * <ns-facets>  Filters, sorting and pagination on category pages without a
 * full page reload. Uses Shopify's Section Rendering API: the same section
 * is fetched for the new URL and its results replace the old ones.
 * Without JavaScript the filter form and links work as normal pages.
 */
(function () {
  'use strict';

  class NsFacets extends HTMLElement {
    connectedCallback() {
      this.sectionId = this.dataset.sectionId;
      this.bind();

      window.addEventListener('popstate', () => this.load(window.location.href, false));
    }

    bind() {
      this.form = this.querySelector('[data-facets-form]');
      this.panel = this.querySelector('[data-facets-panel]');
      this.sort = this.querySelector('[data-facets-sort]');
      this.backdrop = this.querySelector('.facets__backdrop');
      this.openButton = this.querySelector('[data-facets-open]');

      if (this.form) {
        var timer = null;
        this.form.addEventListener('change', () => {
          clearTimeout(timer);
          timer = setTimeout(() => this.submit(), 300);
        });
        this.form.addEventListener('submit', (event) => {
          event.preventDefault();
          this.submit();
          this.closePanel();
        });
      }
      if (this.sort) this.sort.addEventListener('change', () => this.submit());

      this.addEventListener('click', (event) => {
        var link = event.target.closest('[data-facets-link]');
        if (link) {
          event.preventDefault();
          this.load(link.href, true);
          return;
        }
        if (event.target.closest('[data-facets-open]')) this.openPanel();
        if (event.target.closest('[data-facets-close]')) this.closePanel();
      });

      this.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.panel && this.panel.classList.contains('is-open')) this.closePanel();
      });
    }

    submit() {
      var params = new URLSearchParams(this.form ? new FormData(this.form) : undefined);
      // Empty price fields should not be sent
      Array.from(params.keys()).forEach((key) => {
        if (params.get(key) === '') params.delete(key);
      });
      params.delete('sort_by');
      if (this.sort && this.sort.value !== this.sort.dataset.default) params.set('sort_by', this.sort.value);
      var base = this.form ? this.form.getAttribute('action') : window.location.pathname;
      var query = params.toString();
      this.load(base + (query ? '?' + query : ''), true);
    }

    async load(url, push) {
      var results = this.querySelector('[data-collection-results]');
      if (results) results.classList.add('is-loading');
      var target = new URL(url, window.location.origin);
      var fetchUrl = new URL(target.toString());
      fetchUrl.searchParams.set('section_id', this.sectionId);

      try {
        var html = await fetch(fetchUrl.toString()).then((r) => r.text());
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.querySelector('ns-facets');
        if (!fresh) throw new Error('No section');

        ['[data-collection-results]', '[data-results-count]', '[data-facets-count]'].forEach((selector) => {
          var oldEl = this.querySelector(selector);
          var newEl = fresh.querySelector(selector);
          if (oldEl && newEl) oldEl.replaceWith(newEl);
        });

        // Refresh filter values (counts, disabled states) but keep open/closed groups
        var oldForm = this.querySelector('[data-facets-form]');
        var newForm = fresh.querySelector('[data-facets-form]');
        if (oldForm && newForm) {
          var openGroups = Array.from(oldForm.querySelectorAll('.facets__group')).map((g) => g.open);
          oldForm.innerHTML = newForm.innerHTML;
          oldForm.querySelectorAll('.facets__group').forEach((g, i) => {
            if (typeof openGroups[i] === 'boolean') g.open = openGroups[i];
          });
        }

        if (push) window.history.pushState({}, '', target.toString());
        var top = this.querySelector('.collection__toolbar');
        if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        window.location.href = target.toString();
      } finally {
        var current = this.querySelector('[data-collection-results]');
        if (current) current.classList.remove('is-loading');
      }
    }

    openPanel() {
      if (!this.panel) return;
      this.panel.classList.add('is-open');
      if (this.backdrop) this.backdrop.hidden = false;
      if (this.openButton) this.openButton.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      var close = this.panel.querySelector('[data-facets-close]');
      if (close) close.focus();
    }

    closePanel() {
      if (!this.panel || !this.panel.classList.contains('is-open')) return;
      this.panel.classList.remove('is-open');
      if (this.backdrop) this.backdrop.hidden = true;
      if (this.openButton) {
        this.openButton.setAttribute('aria-expanded', 'false');
        this.openButton.focus();
      }
      document.body.style.overflow = '';
    }
  }

  if (!customElements.get('ns-facets')) customElements.define('ns-facets', NsFacets);
})();
