import { join } from "node:path";
export function getSourceDir() {
    return join(import.meta.dirname,'..','..');
}
export function deepMerge(target: Record<string, any>, source: Record<string, any>):Record<string,any> {
    if (typeof target !== 'object' || target === null) {
        throw new TypeError('Target must be a non-null object');
    }
    if (typeof source !== 'object' || source === null) {
        throw new TypeError('Source must be a non-null object');
    }

    const targetCopy = {...target};//copy object

    for(const key of Object.keys(target)) {
        if(Object.hasOwn(target,key)) { //avoid prototype poisoning if property is enumerable () copy it
            targetCopy[key] = target[key];
        }
    }

    for (const key of Object.keys(source)) {
        const targetValue = targetCopy[key];
        const sourceValue = source[key];

        if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
            if (typeof targetValue !== 'object' || targetValue === null) {
                targetCopy[key] = {}; // if target value is not an object initialise as empty object
            }
            targetCopy[key] = deepMerge(targetCopy[key], sourceValue);
        } else {
            targetCopy[key] = sourceValue;
        }
    }
    return targetCopy;
}