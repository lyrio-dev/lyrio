import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments
} from "class-validator";

export function If<T = any>(
  callback: (value: T) => boolean,
  validationOptions?: ValidationOptions
) {
  return function(object: Object, propertyName: string) {
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

// class-validator's IsPort accepts strings only, but I prefer
// writting port numbers as number
export function IsPortNumber(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return Number.isInteger(value) && value >= 1 && value <= 65535;
        }
      }
    });
  };
}

// A username is a string of 3 ~ 24 ASCII characters, and each character
// is a uppercase / lowercase letter or a number or any of '-_.#$' and is
// NOT '%'.
//
// TODO: Add Chinese support
export function IsUsername(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return (
            typeof value === "string" &&
            /^[a-zA-Z0-9\-\_\.\#\$]{3,24}$/.test(value)
          );
        }
      }
    });
  };
}

// A group name is a string of 1 ~ 48 ASCII characters, and each character
// is a uppercase / lowercase letter or a number or any of ' :@~-_.#$/'
// and is NOT '%'.
//
// TODO: Add Chinese support
export function IsGroupName(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return (
            typeof value === "string" &&
            /^[a-zA-Z0-9\ \:\@\~\-\_\.\#\$\/]{1,48}$/.test(value)
          );
        }
      }
    });
  };
}
