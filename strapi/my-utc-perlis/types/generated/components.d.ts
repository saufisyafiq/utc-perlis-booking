import type { Schema, Struct } from '@strapi/strapi';

export interface OperatingHourScheduleOperatingSchedule
  extends Struct.ComponentSchema {
  collectionName: 'components_operating_hour_schedule_operating_schedules';
  info: {
    displayName: 'schedule.operating-schedule';
    icon: 'apps';
  };
  attributes: {
    dayRange: Schema.Attribute.String;
    scheduleShift: Schema.Attribute.Component<
      'schedule-shift.schedule-shift',
      true
    > &
      Schema.Attribute.Required;
  };
}

export interface PaymentPaymenDetails extends Struct.ComponentSchema {
  collectionName: 'components_payment_paymen_details';
  info: {
    displayName: 'Paymen Details';
    icon: 'database';
  };
  attributes: {
    method: Schema.Attribute.String;
    paidAt: Schema.Attribute.DateTime;
    payment_status: Schema.Attribute.Enumeration<
      ['PENDING', 'PAID', 'REFUNDED', 'FAILED']
    >;
    transactionId: Schema.Attribute.String;
  };
}

export interface PricingPricingDetails extends Struct.ComponentSchema {
  collectionName: 'components_pricing_pricing_details';
  info: {
    displayName: 'Pricing Details';
    icon: 'briefcase';
  };
  attributes: {
    basePrice: Schema.Attribute.Decimal;
    cateringPrice: Schema.Attribute.Decimal;
    equipmentPrice: Schema.Attribute.Decimal;
    tax: Schema.Attribute.Decimal;
    total: Schema.Attribute.Decimal;
  };
}

export interface ScheduleShiftScheduleShift extends Struct.ComponentSchema {
  collectionName: 'components_schedule_shift_schedule_shifts';
  info: {
    displayName: 'Schedule Shift';
    icon: 'bulletList';
  };
  attributes: {
    endTime: Schema.Attribute.Time &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'17:00:00.000'>;
    isRest: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    startTime: Schema.Attribute.Time &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'08:00:00.000'>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'operating-hour.schedule-operating-schedule': OperatingHourScheduleOperatingSchedule;
      'payment.paymen-details': PaymentPaymenDetails;
      'pricing.pricing-details': PricingPricingDetails;
      'schedule-shift.schedule-shift': ScheduleShiftScheduleShift;
    }
  }
}
