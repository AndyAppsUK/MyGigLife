/**
 * MyGigLife - IndexedDB Wrapper
 * Simple promise-based wrapper for IndexedDB operations
 */

const DB = (() => {
  const DB_NAME = 'MyGigLife';
  const DB_VERSION = 1;
  const STORE_GIGS = 'gigs';

  let db = null;

  /**
   * Open/initialise the IndexedDB database
   */
  function init() {
    return new Promise((resolve, reject) => {
      if (db) {
        resolve(db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // Create gigs object store with auto-incremented key
        if (!database.objectStoreNames.contains(STORE_GIGS)) {
          const store = database.createObjectStore(STORE_GIGS, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('artist', 'artist', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Generate a UUID (v4)
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Save or update a gig
   * @param {Object} gig - Gig object (id optional for new gigs)
   * @returns {Promise<Object>} - Saved gig with id
   */
  function saveGig(gig) {
    return init().then((database) => {
      return new Promise((resolve, reject) => {
        const now = new Date().toISOString();

        if (!gig.id) {
          gig.id = generateId();
          gig.createdAt = now;
        }
        gig.updatedAt = now;

        const transaction = database.transaction([STORE_GIGS], 'readwrite');
        const store = transaction.objectStore(STORE_GIGS);
        const request = store.put(gig);

        request.onsuccess = () => resolve(gig);
        request.onerror = (e) => reject(e.target.error);
      });
    });
  }

  /**
   * Get a single gig by ID
   * @param {string} id - Gig UUID
   * @returns {Promise<Object|null>}
   */
  function getGig(id) {
    return init().then((database) => {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_GIGS], 'readonly');
        const store = transaction.objectStore(STORE_GIGS);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
      });
    });
  }

  /**
   * Get all gigs as an array
   * @returns {Promise<Array>}
   */
  function getAllGigs() {
    return init().then((database) => {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_GIGS], 'readonly');
        const store = transaction.objectStore(STORE_GIGS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
      });
    });
  }

  /**
   * Delete a gig by ID
   * @param {string} id - Gig UUID
   * @returns {Promise<void>}
   */
  function deleteGig(id) {
    return init().then((database) => {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_GIGS], 'readwrite');
        const store = transaction.objectStore(STORE_GIGS);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
    });
  }

  /**
   * Clear all gigs from the database
   * @returns {Promise<void>}
   */
  function clearAll() {
    return init().then((database) => {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_GIGS], 'readwrite');
        const store = transaction.objectStore(STORE_GIGS);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
    });
  }

  /**
   * Export all data as JSON string
   * @returns {Promise<string>}
   */
  function exportJSON() {
    return getAllGigs().then((gigs) => {
      return JSON.stringify({
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        gigs
      }, null, 2);
    });
  }

  /**
   * Import gigs from JSON string (merges with existing)
   * @param {string} jsonString
   * @returns {Promise<number>} - Number of gigs imported
   */
  function importJSON(jsonString) {
    return new Promise((resolve, reject) => {
      let data;
      try {
        data = JSON.parse(jsonString);
      } catch (e) {
        reject(new Error('Invalid JSON format'));
        return;
      }

      const gigs = data.gigs || (Array.isArray(data) ? data : []);
      if (!gigs.length) {
        resolve(0);
        return;
      }

      const promises = gigs.map((gig) => saveGig(gig));
      Promise.all(promises).then(() => resolve(gigs.length)).catch(reject);
    });
  }

  // Public API
  return { init, saveGig, getGig, getAllGigs, deleteGig, clearAll, exportJSON, importJSON, generateId };
})();
