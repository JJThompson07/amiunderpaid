<template>
  <AmICardRole
    :title="listing.title"
    :company="listing.company.display_name"
    :contract="listing.contract_type"
    :schedule="listing.contract_time"
    :location="listing.location.display_name"
    :salary-min="listing.salary_min"
    :salary-max="listing.salary_max"
    :user-salary="userSalary"
    :market-average="marketAverage"
    :currency-symbol="currencySymbol"
    :url="sanitizeUrl(listing.redirect_url)"
    :raw-salary="listing.raw_salary"
    data-provider="jooble" />
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { sanitizeUrl } from '~~/shared/utils/sanitize';

defineProps({
  listing: {
    type: Object as PropType<any>,
    required: true
  },
  userSalary: {
    type: Number,
    required: true
  },
  marketAverage: {
    type: Number,
    required: true
  },
  currencySymbol: {
    type: String,
    required: true
  }
});
</script>
