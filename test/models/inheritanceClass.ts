import { arrayProp, prop } from '../../src/prop';
import { getModelForClass, modelOptions } from '../../src/typegoose';
export enum BuildingTypes  {
  SummerHouse = 'SummerHouse',
  Garage = 'Garage',
  Skyscraper = 'Skyscraper'
}
@modelOptions({
  schemaOptions: {
    discriminatorKey: 'type',
    collection: 'buildings'
  }
})
export class Building {
  @prop({default: 100})
  public width: number;

  @prop({enum: BuildingTypes})
  public type: BuildingTypes;
}
export class OfficeBuilding extends Building {
  @prop({default: 4})
  public doors: number;
}

@modelOptions({
  discriminatorId: BuildingTypes.Garage
})
export class Garage extends Building {
  @prop({default: 10})
  public slotsForCars: number;
}
@modelOptions({
  discriminatorId: BuildingTypes.SummerHouse
})
export class SummerHouse extends  Building {
  @prop({default: 100})
  public distanceToLake: number;
}
@modelOptions({
  schemaOptions: {
    collection: 'skyscrapers'
  }
})
export class Skyscraper extends OfficeBuilding {
  @prop({default: 'Some cool string'})
  public name: string;

  @prop()
  public mainGarage: Garage;

  @arrayProp({_id: false, items: Garage})
  public garagesInArea: Garage[];

  @arrayProp({_id: false,
    items: Building,
    discriminatorClasses: [SummerHouse, Garage],
  })
  public buildings: Building[];
}

export const model = getModelForClass<Skyscraper, any >(Skyscraper);
