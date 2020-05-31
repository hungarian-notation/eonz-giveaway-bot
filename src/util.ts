
import * as fs from "fs";
import escapeString from "escape-string-regexp";

export type ErrorObject = {
    name:       string;
    message:    string;
    stack?:     string;
    code?:      string;
}

export type GenericRecord = Record<string | number | symbol, unknown>;

export function isRecord(value: unknown): value is GenericRecord {
    return typeof value === "object" && value !== null;
}

export function isErrorObject(value: unknown): value is ErrorObject {
    if (isRecord(value)) {
        // required
        if ("name" in value == false || typeof value.name != "string")
            return false;
        if ("message" in value == false || typeof value.message != "string")
            return false;

        // optional
        if ("stack" in value && typeof value.stack != "string")
            return false;
        if ("code" in value && typeof value.code != "string")
            return false;

        return true;
    } else {
        return false;
    }
}

export type RecursivePartial<T> = {
    [P in keyof T]?:
    T[P] extends (infer U)[] ? RecursivePartial<U>[] :
    // eslint-disable-next-line @typescript-eslint/ban-types
    T[P] extends object ? RecursivePartial<T[P]> :
    T[P];
};

export function explain(explanation: string): Explainer {
    return new Explainer(explanation);
}

export class Explainer {
    explanation: string;

    constructor(str: string) {
        this.explanation = str;
    }

    defined<T>(value: T | undefined): T {
        return defined(value, this.explanation + " was undefined");
    }
}

export function defined<T>(value: T | undefined, explanation?: string): T {
    if (typeof value == "undefined") {
        throw new TypeError(explanation ?? `value was not defined`);
    } else {
        return value;
    }
}