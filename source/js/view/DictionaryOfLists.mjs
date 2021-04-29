export class DictionaryOfLists {
    constructor() {
        this.storage = {};
    }

    add(key, value) {
        const current = this.storage[key];
        if (current !== undefined) {
            current.push(value);
        }
        else {
            this.storage[key] = [value];
        }
    }

    getValues(key) {
        return this.storage[key];
    }

    remove(key, value) {
        const current = this.storage[key];
        const index = current.indexOf(value);
        current.splice(index, 1);
        if (current.length === 0) {
            delete this.storage[key];
        }
    }
}
