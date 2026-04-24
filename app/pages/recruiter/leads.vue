<template>
  <div class="bg-slate-50 p-4 pt-24 min-h-screen">
    <SectionSharedBackdrop />

    <div class="max-w-6xl mx-auto relative flex flex-col gap-8">
      <header
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-3xl shadow-md border border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900">
            {{ $t('recruiter.leads.title', 'My Leads') }}
          </h1>
          <p class="text-slate-500 mt-1 text-sm">
            {{
              $t(
                'recruiter.leads.subtitle',
                'Manage your inbound leads and Lead Contact Card settings.'
              )
            }}
          </p>
        </div>
        <AmITabs v-model="activeTab" :options="tabOptions" round />
      </header>

      <!-- TAB: LEADS TABLE -->
      <div
        v-if="activeTab === 'leads'"
        class="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200 animate-in fade-in duration-300">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <h2 class="text-xl font-bold text-slate-900">
            {{ $t('recruiter.leads.table-title', 'Inbound Leads') }}
          </h2>
        </div>
        <AmITable
          :columns="tableColumns"
          :data="leadsData"
          :empty-message="
            $t(
              'recruiter.leads.empty',
              'No leads found yet. Claim territories and set up your Lead Contact Card to get started.'
            )
          " />
      </div>

      <!-- TAB: WIDGET SETTINGS -->
      <div
        v-else-if="activeTab === 'settings'"
        class="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200 animate-in fade-in duration-300 w-full">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <h2 class="text-xl font-bold text-slate-900">
            {{ $t('recruiter.leads.settings-title', 'Lead Contact Card Settings') }}
          </h2>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <!-- General Settings Column -->
          <div class="space-y-6">
            <div>
              <h3 class="text-sm font-bold text-slate-800">
                {{ $t('recruiter.leads.general-settings', 'General Settings') }}
              </h3>
              <p class="text-xs text-slate-500 mt-1">
                {{
                  $t(
                    'recruiter.leads.general-helper',
                    'These details will be used as the default for your contact cards.'
                  )
                }}
              </p>
            </div>

            <AmIInputImage
              :label="$t('recruiter.leads.fields.logo', 'Company Logo')"
              :placeholder="$t('recruiter.leads.fields.upload-logo', 'Upload Logo (.png, .jpg)')"
              :file-name="logoFileName"
              @change="onLogoSelect" />

            <AmIInputGeneric
              v-model="form.title"
              :label="$t('recruiter.leads.fields.title', 'Lead Contact Card Title')"
              placeholder="e.g. Talk to our hiring experts" />

            <AmIInputTextarea
              v-model="form.content"
              :label="$t('recruiter.leads.fields.content', 'Lead Contact Card Content')"
              :placeholder="
                $t(
                  'recruiter.leads.fields.content-placeholder',
                  'Why should candidates contact you...'
                )
              "
              :rows="4" />

            <AmIInputGeneric
              v-model="form.buttonText"
              :label="$t('recruiter.leads.fields.button-text', 'Button Text')"
              placeholder="e.g. Contact Us" />
          </div>

          <!-- Category Specific Column -->
          <div class="space-y-6">
            <div>
              <h3 class="text-sm font-bold text-slate-800">
                {{ $t('recruiter.leads.category-settings', 'Industry-Specific Content') }}
              </h3>
              <p class="text-xs text-slate-500 mt-1">
                {{
                  $t(
                    'recruiter.leads.category-helper',
                    'Override the general content message for specific industries. If left blank, the general content will be used.'
                  )
                }}
              </p>
            </div>

            <div v-if="userProfile && userProfile?.coveredCategories?.length > 0" class="space-y-6">
              <AmIInputTextarea
                v-for="category in userProfile.coveredCategories"
                :key="category"
                v-model="form.categoryContent[category]"
                :label="category"
                :placeholder="$t('recruiter.leads.fields.category-placeholder', { category })"
                :rows="3" />
            </div>
            <div
              v-else
              class="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-center h-full min-h-40">
              <p class="text-xs font-bold text-slate-400">
                {{
                  $t(
                    'recruiter.leads.no-categories',
                    'You have not selected any covered industries in your profile.'
                  )
                }}
              </p>
            </div>
          </div>
        </div>

        <div class="pt-6 mt-8 border-t border-slate-100 flex justify-end">
          <AmIButton :loading="isSaving" @click="saveSettings">
            {{ $t('common.saved.save', 'Save Settings') }}
          </AmIButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'recruiters' });

const { t } = useI18n();
const { userProfile, updateProfile } = useUserProfile();
const { showToast } = useSystemToast();

const activeTab = ref('leads');
const tabOptions = [
  { label: t('recruiter.leads.tab-leads', 'Leads'), value: 'leads' },
  { label: t('recruiter.leads.tab-settings', 'Settings'), value: 'settings' }
];

// Table Config
const tableColumns = [
  { key: 'date', label: 'Date', class: 'w-32' },
  { key: 'name', label: 'Candidate Name' },
  { key: 'role', label: 'Role Searched' },
  { key: 'location', label: 'Location' }
];
const leadsData = ref<any[]>([]); // Will hook up to Firestore later!

// Form State
const isSaving = ref(false);
const logoFile = ref<File | null>(null);
const logoFileName = ref('');

const form = reactive({
  title: '',
  content: '',
  buttonText: '',
  categoryContent: {} as Record<string, string>
});

// Load existing Lead Contact Card settings
watch(
  userProfile,
  (newProfile) => {
    if (newProfile?.leadWidget) {
      form.title = newProfile.leadWidget.title || '';
      form.content = newProfile.leadWidget.content || '';
      form.buttonText = newProfile.leadWidget.buttonText || '';
      form.categoryContent = { ...(newProfile.leadWidget.categoryContent || {}) };
    }
  },
  { immediate: true }
);

const onLogoSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    logoFile.value = file;
    logoFileName.value = file.name;
  }
};

const saveSettings = async () => {
  isSaving.value = true;
  try {
    // TODO: Upload logoFile.value to Firebase Storage if it exists

    await updateProfile({
      leadWidget: {
        title: form.title,
        content: form.content,
        buttonText: form.buttonText,
        categoryContent: form.categoryContent
      }
    });
    showToast('Success', 'Lead Contact Card settings saved successfully.', 'success');
  } catch {
    showToast('Error', 'Failed to save Lead Contact Card settings.', 'error');
  } finally {
    isSaving.value = false;
  }
};
</script>
