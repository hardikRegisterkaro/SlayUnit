const STORAGE_KEY = 'slay_wishlist';

const WishlistManager = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  },
  has(id) {
    return this.get().some((p) => String(p.id) === String(id));
  },
  toggle(product) {
    const list = this.get();
    const idx = list.findIndex((p) => String(p.id) === String(product.id));
    let added;
    if (idx === -1) {
      list.push(product);
      added = true;
    } else {
      list.splice(idx, 1);
      added = false;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('wishlist:changed', { detail: { list, added, id: product.id } }));
    return added;
  },
  count() {
    return this.get().length;
  },
  getAll() {
    return this.get();
  },
};

class WishlistButton extends HTMLElement {
  connectedCallback() {
    const id = this.dataset.productId;
    this._setActive(WishlistManager.has(id));

    this.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const product = {
        id: this.dataset.productId,
        handle: this.dataset.handle,
        title: this.dataset.title,
        price: this.dataset.price,
        image: this.dataset.image,
        url: this.dataset.url,
      };
      const added = WishlistManager.toggle(product);
      this._setActive(added);
    });

    window.addEventListener('wishlist:changed', (e) => {
      if (String(e.detail.id) === String(id)) {
        this._setActive(e.detail.added);
      }
    });
  }

  _setActive(active) {
    this.classList.toggle('wishlist-btn--active', active);
    this.setAttribute('aria-pressed', active);
    this.setAttribute('aria-label', active ? 'Remove from wishlist' : 'Add to wishlist');
    const svg = this.querySelector('svg');
    if (svg) svg.style.fill = active ? 'currentColor' : 'none';
  }
}

class WishlistCount extends HTMLElement {
  connectedCallback() {
    this._update();
    window.addEventListener('wishlist:changed', () => this._update());
  }

  _update() {
    const count = WishlistManager.count();
    const badge = this.querySelector('.wishlist-nav-badge');
    if (badge) {
      badge.textContent = count > 0 ? count : '';
      badge.hidden = count === 0;
    }
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

class WishlistDrawer extends HTMLElement {
  connectedCallback() {
    this._dialog = this.querySelector('dialog');
    this._list = this.querySelector('.wishlist-drawer__list');

    this.querySelector('.wishlist-nav__trigger')?.addEventListener('click', () => this.open());
    this.querySelector('.wishlist-drawer__close')?.addEventListener('click', () => this.close());
    this._dialog?.addEventListener('click', (e) => {
      if (e.target === this._dialog) this.close();
    });

    window.addEventListener('wishlist:changed', () => {
      if (this._dialog?.open) this._render();
    });
  }

  open() {
    this._render();
    this._dialog?.showModal();
  }

  close() {
    this._dialog?.close();
  }

  _render() {
    if (!this._list) return;
    const items = WishlistManager.getAll();
    if (items.length === 0) {
      this._list.innerHTML = '<p class="wishlist-drawer__empty">No saved items yet.</p>';
      return;
    }
    this._list.innerHTML = items.map((p) => `
      <div class="wishlist-drawer__item" data-id="${escHtml(p.id)}">
        <a href="${escHtml(p.url)}" class="wishlist-drawer__item-media">
          ${p.image ? `<img src="${escHtml(p.image)}" alt="${escHtml(p.title)}" width="80" height="100" loading="lazy">` : '<div class="wishlist-drawer__item-placeholder"></div>'}
        </a>
        <div class="wishlist-drawer__item-info">
          <a href="${escHtml(p.url)}" class="wishlist-drawer__item-title">${escHtml(p.title)}</a>
          <span class="wishlist-drawer__item-price">${escHtml(p.price)}</span>
        </div>
        <button class="wishlist-drawer__item-remove button-unstyled" aria-label="Remove ${escHtml(p.title)} from wishlist" data-id="${escHtml(p.id)}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');

    this._list.querySelectorAll('.wishlist-drawer__item-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = WishlistManager.getAll().find((p) => String(p.id) === String(id));
        if (item) WishlistManager.toggle(item);
      });
    });
  }
}

customElements.define('wishlist-button', WishlistButton);
customElements.define('wishlist-count', WishlistCount);
customElements.define('wishlist-drawer', WishlistDrawer);
