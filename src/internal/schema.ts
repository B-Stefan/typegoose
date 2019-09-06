import * as mongoose from 'mongoose';

import { IModelOptions } from '../typegoose';
import { EmptyVoidFn, NoParamConstructor } from '../types';
import { DecoratorKeys } from './constants';
import { buildSchemas, hooks, plugins, schemas, virtuals } from './data';
import { NoValidClass } from './errors';
import { getName, getParentClasses } from './utils';

/**
 * Private schema builder for a class including parent classes
 * -> If you discover this, dont use this function, use Typegoose.buildSchema!
 * @param cl The not initialized Class
 * @param opt The options for the mongoose schema
 * @returns Returns the Build Schema
 * @private
 */
export function _buildSchema<T, U extends NoParamConstructor<T>>(
  cl: U,
  opt: mongoose.SchemaOptions = {}) {
  let  sch: mongoose.Schema<U>;

  // Go though every class from top level to bottom
  getParentClasses(cl)
    .reverse()
    .forEach((parent) => {
      sch = getSchemaForClass(parent, sch);
    });

  return getSchemaForClass<T, U>(cl, sch, opt);
}

/**
 * Private schema builder for a single class
 * -> If you discover this, dont use this function, use Typegoose.buildSchema!
 * @param cl The not initialized Class
 * @param sch Already Existing Schema?
 * @param opt The options for the mongoose schema
 * @returns Returns the Build Schema
 * @private
 */
function getSchemaForClass<T, U extends NoParamConstructor<T>>(
  cl: U,
  sch?: mongoose.Schema,
  opt: mongoose.SchemaOptions = {}
) {
  if (typeof cl !== 'function') {
    throw new NoValidClass(cl);
  }

  const name = getName(cl);
  if (buildSchemas.get(name)) {
    return buildSchemas.get(name);
  }

  /** Simplify the usage */
  const Schema = mongoose.Schema;
  const { schemaOptions: ropt }: IModelOptions = Reflect.getMetadata(DecoratorKeys.ModelOptions, cl) || {};
  const schemaOptions = Object.assign(ropt || {}, opt);

  if (!schemas.get(name)) {
    schemas.set(name, {});
  }

  if (!(sch instanceof Schema)) {
    sch = new Schema(schemas.get(name), schemaOptions);
  } else {
    sch = sch.clone();
    sch.add(schemas.get(name));
  }

  sch.loadClass(cl);

  const hook = hooks.get(name);
  if (hook) {
    hook.pre.forEach((func, method) => {
      sch.pre(method as string, func as EmptyVoidFn);
      // ^ look at https://github.com/DefinitelyTyped/DefinitelyTyped/issues/37333
    });

    hook.post.forEach((v, k) => sch.post(k, v));
  }

  if (plugins.get(name)) {
    for (const plugin of plugins.get(name)) {
      sch.plugin(plugin.mongoosePlugin, plugin.options);
    }
  }

  /** Simplify the usage */
  const getterSetters = virtuals.get(name);
  if (getterSetters) {
    for (const [key, virtual] of getterSetters) {
      sch.virtual(key, virtual);
    }
  }

  /** Get Metadata for indices */
  const indices: any[] = Reflect.getMetadata(DecoratorKeys.Index, cl) || [];
  for (const index of indices) {
    sch.index(index.fields, index.options);
  }

  buildSchemas.set(name, sch);

  return sch;
}
