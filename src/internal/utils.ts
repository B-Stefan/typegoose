import * as mongoose from 'mongoose';

import { isNullOrUndefined, deprecate } from 'util';
import { IModelOptions } from '../typegoose';
import {
  NoParamConstructor,
  PropOptionsWithNumberValidate,
  PropOptionsWithStringValidate,
  VirtualOptions
} from '../types';
import { DecoratorKeys } from './constants';
import { constructors, schemas } from './data';

/**
 * Returns true, if it includes the Type
 * @param Type The Type
 * @returns true, if it includes it
 */
export function isPrimitive(Type: any): boolean {
  return ['String', 'Number', 'Boolean', 'Date', 'Decimal128', 'ObjectID'].includes(Type.name);
}

/**
 * Returns true, if it is an Object
 * @param Type The Type
 * @returns true, if it is an Object
 */
export function isObject(Type: any): boolean {
  let prototype = Type.prototype;
  let name = Type.name;
  while (name) {
    if (name === 'Object') {
      return true;
    }
    prototype = Object.getPrototypeOf(prototype);
    name = prototype ? prototype.constructor.name : null;
  }

  return false; // can this even return false?
}

/**
 * Returns true, if it is an Number
 * @param Type The Type
 * @returns true, if it is an Number
 */
export function isNumber(Type: any): Type is number {
  return Type.name === 'Number';
}

/**
 * Returns true, if it is an String
 * @param Type The Type
 * @returns true, if it is an String
 */
export function isString(Type: any): Type is string {
  return Type.name === 'String';
}

/**
 * Initialize as Object
 * @param name The Name of the Schema
 * @param key The Property key to set
 */
export function initAsObject(name: string, key: string): void {
  if (!schemas.get(name)) {
    schemas.set(name, {});
  }
  schemas.get(name)[key] = {};
}

/**
 * Initialize as Array
 * @param name The Name of the Schema
 * @param key The Property key to set
 */
export function initAsArray(name: string, key: string): void {
  if (!schemas.get(name)) {
    schemas.set(name, {});
  }
  schemas.get(name)[key] = [{}];
}

/**
 * Get the Class for a given Document
 * @param document The Document
 */
export function getClassForDocument(document: mongoose.Document): NewableFunction | undefined {
  const modelName = (document.constructor as mongoose.Model<typeof document>).modelName;

  return constructors.get(modelName);
}

/**
 * Return true if there are Options
 * @param options The raw Options
 */
export function isWithStringValidate(
  options: PropOptionsWithStringValidate
): options is PropOptionsWithStringValidate {
  return !isNullOrUndefined(
    options.match
    || options.enum
    || options.minlength
    || options.maxlength
  );
}

/**
 * Return true if there are Options
 * @param options The raw Options
 */
export function isWithStringTransform(
  options: PropOptionsWithStringValidate
): options is PropOptionsWithStringValidate {
  return !isNullOrUndefined(options.lowercase || options.uppercase || options.trim);
}

/**
 * Return true if there are Options
 * @param options The raw Options
 */
export function isWithNumberValidate(options: PropOptionsWithNumberValidate): options is PropOptionsWithNumberValidate {
  return !isNullOrUndefined(options.min || options.max);
}

const virtualOptions = ['localField', 'foreignField'];

/**
 * Check if Options include Virtual Populate Options
 * @param options RawOptions of the Prop
 */
export function isWithVirtualPOP(options: any): options is VirtualOptions {
  return Object.keys(options).some((v) => virtualOptions.includes(v));
}

export const allVirtualoptions = virtualOptions.slice(0);
allVirtualoptions.push('ref');

/**
 * Check if All the required Options are present
 * @param options RawOptions of the Prop
 */
export function includesAllVirtualPOP(options: VirtualOptions): options is VirtualOptions {
  return allVirtualoptions.every((v) => Object.keys(options).includes(v));
}

/**
 * Merges existing metadata with new value
 * @param key Metadata key
 * @param value Raw value
 * @param cl The constructor
 */
export function assignMetadata(key: string, value: unknown, cl: new () => {}): void {
  const current = Reflect.getMetadata(key, cl) || {};
  const newValue = Object.assign(current, value);
  Reflect.defineMetadata(key, newValue, cl);
}

/**
 * Get the correct name of the class's model
 * (with suffix)
 * @param cl The Class
 */
export function getName<T, U extends NoParamConstructor<T>>(cl: U) {
  const options: IModelOptions = Reflect.getMetadata(DecoratorKeys.ModelOptions, cl) || {};

  const baseName = cl.name;
  const suffix = (options.options ? options.options.customName : undefined) ||
    (options.schemaOptions ? options.schemaOptions.collection : undefined);

  return suffix ? `${baseName}_${suffix}` : baseName;
}

/**
 *  Returns the list of all parent classes.
 *  @param cl Class which potentially extend other class
 */
export function getParentClasses<U = unknown>(cl: U) {
  const list: (new () => unknown)[] = [];
  let parentCtor = Object.getPrototypeOf(cl);

  while (parentCtor && parentCtor.name && parentCtor.name !== 'Object') {
    /* istanbul ignore next */
    if (parentCtor.name === 'Typegoose') { // TODO: remove this if, if the Typegoose class gets removed [DEPRECATION]
      deprecate(() => undefined, 'The Typegoose Class is deprecated, please try to remove it')();
      break;
    }

    // extend schema
    list.push(parentCtor);
    // next parent
    parentCtor = Object.getPrototypeOf(parentCtor);
  }

  return list;
}
