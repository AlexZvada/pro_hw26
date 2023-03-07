'use strict';
class ServerRequests {
    #baseURL = 'https://todo.hillel.it';
    #token = null;
    storage = localStorage;

    async login(name, email) {
        if (localStorage.getItem(name + email)) {
            this.#token = JSON.parse(localStorage.getItem(name + email));
        }
        if (!this.#token) {
            const responce = await fetch(`${this.#baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-type': 'application/json',
                },
                body: JSON.stringify({
                    value: name + email,
                }),
            });

            const resp = await responce.json();
            this.#token = resp.access_token;
            localStorage.setItem(name + email, JSON.stringify(this.#token));
        }
    }

    async add(text) {
        const toServer = {
            value: text,
            priority: 1,
        };
        const responce = await fetch(`${this.#baseURL}/todo`, {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
                'Authorization': `Bearer ${this.#token ? this.#token : this.getToken()}`,
            },
            body: JSON.stringify(toServer),
        });

        if (responce.ok) {
            const noteFromServer = await responce.json();
            return noteFromServer;
        }
    }
    async getNotes() {
        const responce = await fetch(`${this.#baseURL}/todo`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.#token ? this.#token : this.getToken()}`,
            },
        });
        if (responce.ok) {
            const notes = await responce.json();
            return notes;
        }
    }

    async reload() {
        if (!this.getToken()) return;
        const responce = await fetch(`${this.#baseURL}/todo`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.#token ? this.#token : this.getToken()}`,
            },
        });
        if (responce.ok) {
            const notes = await responce.json();
            return notes;
        }
    }
    async changeNote(noteID, text) {
        const id = noteID.toString();
        const toServer = {
            value: text,
            priority: 1,
        };
        await fetch(`${this.#baseURL}/todo/${id}`, {
            method: 'PUT',
            headers: {
                'Content-type': 'application/json',
                'Authorization': `Bearer ${this.#token ? this.#token : this.getToken()}`,
            },
            body: JSON.stringify(toServer),
        });
    }
    async toggle(noteID) {
        const id = noteID.toString();
        await fetch(`${this.#baseURL}/todo/${id}/toggle`, {
            method: 'PUT',
            headers: {
                'Content-type': 'application/json',
                'Authorization': `Bearer ${this.#token ? this.#token : this.getToken()}`,
            },
        });
    }
    async removeNote(noteID) {
        const id = noteID.toString();
        await fetch(`${this.#baseURL}/todo/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-type': 'application/json',
                'Authorization': `Bearer ${this.#token ? this.#token : this.getToken()}`,
            },
        });
    }

    getToken() {
        const index = 0;
        const key = this.storage.key(index);
        if (key) {
            return JSON.parse(this.storage.getItem(key));
        }
    }
}
class Model {
    notes = [];
    requests = new ServerRequests();
    storage = localStorage;
    id = null;
    note = null;

    async login(name, email) {
        await this.requests.login(name, email);
        const notes = await this.requests.getNotes();
        this.notes = [];
        notes.forEach(({ value, _id, checked }) => {
            const note = {
                text: value,
                status: checked,
                id: _id,
            };
            this.notes.push(note);
        });
    }
    async reloadPage() {
        const notes = await this.requests.reload();
        if (!notes) return;
        notes.forEach(({ value, _id, checked }) => {
            const note = {
                text: value,
                status: checked,
                id: _id,
            };
            this.notes.push(note);
        });
    }
    async add(text) {
        if (text === '') return;
        const { value, _id, checked } = await this.requests.add(text);
        const note = {
            text: value,
            status: checked,
            id: _id,
        };
        this.notes.push(note);
        return note.id;
    }

    delete(id) {
        this.notes = this.notes.filter(el => el.id !== id);
        this.requests.removeNote(id);
    }
    deleteAll() {
        this.notes.forEach(({ id }) => this.delete(id));
    }

    edit(id, text) {
        const note = this.notes.find(x => Number(id) === x.id);
        note.text = text;
        this.requests.changeNote(id, text);
    }

    toggle(id) {
        const note = this.notes.find(x => Number(id) === x.id);
        note.status = !note.status;
        this.requests.toggle(id);
    }

    filterNotes(state) {
        if (state === 'all') return this.notes;
        if (state === 'done') {
            return this.notes.filter(x => x.status === true);
        }
        if (state === 'not-done') {
            return this.notes.filter(x => x.status === false);
        }
    }

    clearStorage() {
        this.storage.clear();
    }
}

class View {
    noteList = document.querySelector('.note-list');
    noteForm = document.querySelector('.note-form');
    noteInput = document.querySelector('.note-input');
    addBtn = document.querySelector('.add-btn');
    clearBtn = document.querySelector('.clear');
    document = document;

    modalAddNote = {
        window: document.querySelector('.modal-add-note-window'),
        addInput: document.querySelector('#add-input'),
        addForm: document.querySelector('#add-form'),
        close: document.querySelector('.close'),
        addNoteBtn: document.querySelector('.modal-btn-add'),
        cancelBtn: document.querySelector('.modal-btn-cansel'),
    };

    modalEditNote = {
        window: document.querySelector('.modal-edit-note-window'),
        open: document.querySelector('.edit-btn'),
        addInput: document.querySelector('#edit-input'),
        addForm: document.querySelector('#edit-form'),
        close: document.querySelector('.edit-close'),
        addBtn: document.querySelector('#edit-note-btn'),
        cancelBtn: document.querySelector('#edit-btn-cansel'),
    };
    modalLogin = {
        window: document.querySelector('.modal-login-window'),
        open: document.querySelector('.login-btn'),
        loginForm: document.querySelector('#login-form'),
        close: document.querySelector('.login-close'),
        loginBtn: document.querySelector('.login'),
        acceptBtn: document.querySelector('#login'),
        cancelBtn: document.querySelector('#login-btn-cancel'),
    };

    selector = document.querySelector('.note-select');

    constructor() {
        this.createNode = (text, id, status) => {
            const note = document.createElement('li');
            const noteText = document.createElement('span');
            const removeBtn = document.createElement('button');
            const editBtn = document.createElement('button');
            const toggle = document.createElement('span');
            note.setAttribute('id', `${id}`);
            note.classList.add('note');
            noteText.classList.add('note-text');
            removeBtn.classList.add('remove-btn');
            editBtn.classList.add('edit-btn');
            toggle.classList.add('note-status');
            if (status) {
                toggle.classList.add('done');
            }

            noteText.innerHTML = text;
            toggle.innerHTML = `${status ? 'DONE' : 'NOT DONE'}`;

            note.append(noteText);
            note.append(toggle);
            note.append(editBtn);
            note.append(removeBtn);

            return note;
        };
        this.deleteNote = note => {
            note.parentNode.removeChild(note);
        };
        this.changeToggle = target => {
            if (target.classList.contains('done')) {
                target.classList.remove('done');
                target.innerHTML = 'NOT DONE';
            } else {
                target.classList.add('done');
                target.innerHTML = 'DONE';
            }
        };
        this.editNote = (note, text) => {
            note.textContent = text;
        };

        this.getInputValue = target => {
            const text = target.value.trim();
            return text;
        };
    }
    //DISPLAY----------------

    displayNotes(notes) {
        this.noteList.innerHTML = '';
        for (const { text, id, status } of notes) {
            const node = this.createNode(text, id, status);
            this.noteList.append(node);
        }
    }
    deleteAll() {
        document.querySelectorAll('li').forEach(x => this.noteList.removeChild(x));
    }

    clearInput() {
        this.noteInput.value = '';
        this.modalAddNote.addInput.value = '';
    }

    //Handlers--------------------------
    //login--------
    loginHandler(handler) {
        this.modalLogin.loginForm.addEventListener('submit', e => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const { name, email } = Object.fromEntries(formData.entries());
            handler(name, email);
        });
    }

    //CRUD-HANDLERS---------
    addNoteHandler(handler) {
        this.noteForm.addEventListener('submit', e => {
            e.preventDefault();
            handler();
        });
    }

    removeNoteHandler(handler) {
        this.noteList.addEventListener('click', ({ target }) => {
            if (target.classList.contains('remove-btn')) {
                const note = target.closest('.note');
                handler(note, note.id);
            }
        });
    }
    deleteAllNotesHandler(handler) {
        this.clearBtn.addEventListener('click', handler);
    }

    toggleHandler(handler) {
        this.noteList.addEventListener('click', ({ target }) => {
            if (target.classList.contains('note-status')) {
                const note = target.closest('.note');
                handler(target, note.id);
            }
        });
    }

    selectHandler(handler) {
        this.selector.addEventListener('change', ({ target }) => {
            handler(target.value);
        });
    }
    //Modals------------------------
    modalOpenLoginHandler(handler) {
        this.modalLogin.open.addEventListener('click', e => {
            if (e.target.closest('.login-btn')) {
                handler();
            }
        });
    }
    modalCloseLoginHandler(handler) {
        this.modalLogin.window.addEventListener('click', ({ target }) => {
            if (target === this.modalLogin.window || target === this.modalLogin.close) {
                handler();
                return;
            }
            if (target === this.modalLogin.acceptBtn || target === this.modalLogin.cancelBtn) {
                handler();
                return;
            }
        });
    }

    modalOpenAddNoteHandler(handler) {
        this.document.addEventListener('click', e => {
            if (e.target.closest('.open-modal-btn')) {
                handler();
            }
        });
    }
    addNoteFromModalHandler(handler) {
        this.modalAddNote.addForm.addEventListener('submit', e => {
            e.preventDefault();
            handler();
        });
    }
    modalCloseAddNoteHandler(handler) {
        this.modalAddNote.window.addEventListener('click', ({ target }) => {
            if (target === this.modalAddNote.window || target === this.modalAddNote.close) {
                handler();
                return;
            }
            if (target === this.modalAddNote.addBtn || target === this.modalAddNote.cancelBtn) {
                handler();
                return;
            }
        });
    }

    modalOpenEditNoteHandler(handler) {
        this.document.addEventListener('click', e => {
            if (e.target.closest('.edit-btn')) {
                const a = 0;
                const note = e.target.closest('.note');
                handler(note.childNodes[a], note.id);
            }
        });
    }
    editNoteFromModalHandler(handler) {
        this.modalEditNote.addForm.addEventListener('submit', e => {
            e.preventDefault();
            handler();
        });
    }
    modalCloseEditNoteHandler(handler) {
        this.modalEditNote.window.addEventListener('click', ({ target }) => {
            if (target === this.modalEditNote.window || target === this.modalEditNote.close) {
                handler();
                return;
            }
            if (target === this.modalEditNote.addBtn || target === this.modalEditNote.cancelBtn) {
                handler();
                return;
            }
        });
    }
}

class Controller {
    model = new Model();
    view = new View();

    constructor() {
        this.view.addNoteHandler(() => this.handleAdd());
        this.view.removeNoteHandler((note, id) => this.handleRemove(note, id));
        this.view.loginHandler((name, email) => this.handleLogin(name, email));
        this.view.modalOpenLoginHandler(() => this.handelOpenModalLogin());
        this.view.modalCloseLoginHandler(() => this.handelCloseModalLogin());
        this.view.toggleHandler((note, id) => this.handelToggle(note, id));
        this.model.reloadPage().then(() => this.view.displayNotes(this.model.notes));

        this.view.modalOpenAddNoteHandler(() => this.handelOpenNoteModal());
        this.view.modalCloseAddNoteHandler(() => this.handelCloseNoteModal());
        this.view.addNoteFromModalHandler(() => this.handelAddNoteModal());

        this.view.modalOpenEditNoteHandler((span, id) => this.handelOpenEditModal(span, id));
        this.view.modalCloseEditNoteHandler(() => this.handelCloseEditModal());
        this.view.editNoteFromModalHandler(() => this.handelEditNoteModal());

        this.view.selectHandler(state => this.handelSelect(state));

        this.view.deleteAllNotesHandler(() => this.handleDeleteAll());
    }

    //LOGIN
    async handleLogin(name, email) {
        this.model.login(name, email).then(() => this.view.displayNotes(this.model.notes));
        this.handelCloseModalLogin();
        this.view.clearInput();
    }

    //ADD
    async handleAdd() {
        const text = this.view.getInputValue(this.view.noteInput);
        if (!text) return;
        const id = await this.model.add(text).catch(() => alert('Allready exist'));
        this.view.noteList.append(this.view.createNode(text, id));
        this.view.clearInput();
    }

    async handelAddNoteModal() {
        const text = this.view.getInputValue(this.view.modalAddNote.addInput);
        const id = await this.model.add(text);
        this.view.noteList.append(this.view.createNode(text, id));
        this.view.clearInput();
        this.handelCloseNoteModal();
    }

    //DELETE
    handleRemove(note, id) {
        this.model.delete(id);
        this.view.deleteNote(note);
    }

    handleDeleteAll() {
        this.view.deleteAll();
        this.model.deleteAll();
    }

    //TOGGLE
    handelToggle(state, id) {
        this.model.toggle(id);
        this.view.changeToggle(state);
    }
    handelSelect(state) {
        const notes = this.model.filterNotes(state);
        this.view.displayNotes(notes);
    }

    //MODALS
    handelOpenModalLogin() {
        this.view.modalLogin.window.style.display = 'block';
    }
    handelCloseModalLogin() {
        this.view.modalLogin.window.style.display = 'none';
    }

    handelOpenNoteModal() {
        this.view.modalAddNote.window.style.display = 'block';
    }
    handelCloseNoteModal() {
        this.view.modalAddNote.window.style.display = 'none';
    }

    handelOpenEditModal(note, id) {
        this.view.modalEditNote.window.style.display = 'block';
        this.view.modalEditNote.addInput.value = note.textContent;
        this.model.id = id;
        this.model.note = note;
    }
    handelEditNoteModal() {
        const text = this.view.getInputValue(this.view.modalEditNote.addInput);
        this.model.edit(this.model.id, text);
        this.view.editNote(this.model.note, text);
        this.model.node = null;
        this.model.id = null;
        this.view.clearInput();
        this.view.modalCloseEditNoteHandler();
    }
    handelCloseEditModal() {
        this.view.modalEditNote.window.style.display = 'none';
    }
}
new Controller();
