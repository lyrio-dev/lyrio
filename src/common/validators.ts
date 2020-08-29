import { registerDecorator, ValidationOptions, ValidationArguments } from "class-validator";

export function If<T = any>(callback: (value: T) => boolean, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: T, args: ValidationArguments) {
          return callback(value);
        }
      }
    });
  };
}

// class-validator's IsNumberString accepts floating numbers only, but I
// want to validate if it's a integer
export function IsIntString(validationOptions?: ValidationOptions) {
  return If(value => typeof value === "string" && Number.isInteger(Number(value)), validationOptions);
}

// class-validator's IsPort accepts strings only, but I prefer
// writting port numbers as number
export function IsPortNumber(validationOptions?: ValidationOptions) {
  return If(value => Number.isInteger(value) && value >= 1 && value <= 65535, validationOptions);
}

// A username is a string of 3 ~ 24 ASCII characters, and each character
// is a uppercase / lowercase letter or a number or any of '-_.#$' and is
// NOT '%'.
//
// TODO: Add Chinese support
export function IsUsername(validationOptions?: ValidationOptions) {
  return If(value => typeof value === "string" && /^[a-zA-Z0-9\-_.#$]{3,24}$/.test(value), validationOptions);
}

// A group name is a string of 1 ~ 48 ASCII characters, and each character
// is a uppercase / lowercase letter or a number or any of ' :@~-_.#$/'
// and is NOT '%'.
//
// TODO: Add Chinese support
export function IsGroupName(validationOptions?: ValidationOptions) {
  return If(value => typeof value === "string" && /^[a-zA-Z0-9 :@~-_.#$/]{1,48}$/.test(value), validationOptions);
}
