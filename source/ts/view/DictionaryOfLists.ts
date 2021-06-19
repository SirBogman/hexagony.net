export class DictionaryOfLists<T> {
    storage = new Map<string, T[]>();

    add(key: string, value: T): void {
        const current = this.storage.get(key);
        if (current !== undefined) {
            current.push(value);
        }
        else {
            this.storage.set(key, [value]);
        }
    }

    getValues(key: string): T[] | undefined {
        return this.storage.get(key);
    }

    remove(key: string, value: T): void {
        const current = this.storage.get(key);
        if (current !== undefined) {
            const index = current.indexOf(value);
            current.splice(index, 1);
            if (current.length === 0) {
                this.storage.delete(key);
            }
        }
    }
}
