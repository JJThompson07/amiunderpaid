<template>
  <div class="bg-slate-50 p-4 pt-24 min-h-screen">
    <SectionSharedBackdrop />

    <div class="max-w-7xl mx-auto relative flex flex-col gap-8">
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

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 lg:gap-12">
          <!-- Form Section -->
          <div class="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                <div
                  class="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl overflow-hidden transition-all duration-300">
                  <button
                    class="w-full flex items-center justify-between p-3 text-left focus:outline-none hover:bg-indigo-100/50 transition-colors"
                    @click="showWildcards = !showWildcards">
                    <span class="text-xs text-indigo-900 font-bold">
                      {{
                        $t(
                          'recruiter.leads.wildcards.title',
                          'Available Wildcards (Use in any text field):'
                        )
                      }}
                    </span>
                    <ChevronDown
                      class="w-4 h-4 text-indigo-500 transition-transform duration-300 shrink-0"
                      :class="{ 'rotate-180': showWildcards }" />
                  </button>
                  <div v-show="showWildcards" class="px-3 pb-3 pt-1 border-t border-indigo-100/50">
                    <ul class="text-2xs text-indigo-800 font-medium space-y-1.5 list-disc pl-4">
                      <li>
                        <strong class="font-bold text-indigo-900">{location}</strong> &mdash;
                        {{ $t('recruiter.leads.wildcards.location', 'The searched region.') }}
                      </li>
                      <li>
                        <strong class="font-bold text-indigo-900">{agency}</strong> &mdash;
                        {{ $t('recruiter.leads.wildcards.agency', 'Your agency name.') }}
                      </li>
                      <li>
                        <strong class="font-bold text-indigo-900">{incentive}</strong> &mdash;
                        {{
                          $t(
                            'recruiter.leads.wildcards.incentive',
                            "Displays 'roles' or 'candidates' depending on the search tool."
                          )
                        }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <AmIInputImage
                :label="$t('recruiter.leads.fields.logo', 'Company Logo')"
                :placeholder="$t('recruiter.leads.fields.upload-logo', 'Upload Logo (.png, .jpg)')"
                :file-name="logoFileName"
                @change="onLogoSelect" />

              <AmIInputGeneric
                v-model="form.title"
                :label="$t('recruiter.leads.fields.title', 'Lead Contact Card Title')"
                label-size="text-2xs"
                label-colour="text-slate-400"
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

              <div class="pt-2 border-t border-slate-100">
                <h3 class="text-sm font-bold text-slate-800">
                  {{ $t('recruiter.leads.custom-colours', 'Custom Colours') }}
                </h3>
                <p class="text-xs text-slate-500 mt-1">
                  {{
                    $t(
                      'recruiter.leads.custom-colours-helper',
                      'Personalise your header and button colours.'
                    )
                  }}
                </p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <AmIInputColour
                  v-model="form.brandBgColour"
                  :label="$t('recruiter.leads.fields.brand-bg-color', 'Background Colour')" />
                <AmIInputColour
                  v-model="form.brandTextColour"
                  :label="$t('recruiter.leads.fields.brand-text-color', 'Text Colour')" />
              </div>
            </div>

            <!-- Specific Column -->
            <div class="space-y-6">
              <div>
                <h3 class="text-sm font-bold text-slate-800">
                  {{ $t('recruiter.leads.custom-cta', 'Custom CTA') }}
                </h3>
                <p class="text-xs text-slate-500 mt-1">
                  {{
                    $t(
                      'recruiter.leads.custom-cta-helper',
                      'Custom button text to entice users to view your Lead contact card.'
                    )
                  }}
                </p>
              </div>

              <div class="space-y-1">
                <AmIInputGeneric
                  v-model="form.buttonText"
                  :label="$t('recruiter.leads.fields.button-text', 'CTA Button Text')"
                  label-size="text-2xs"
                  label-colour="text-slate-400"
                  placeholder="e.g. Contact {agency}" />
                <p v-if="buttonTextError" class="text-xs text-negative-600 font-medium px-1">
                  {{ buttonTextError }}
                </p>
                <p v-else class="text-2xs text-slate-400 px-1">
                  {{
                    $t(
                      'recruiter.leads.fields.button-text-helper',
                      'Must include the {agency} wildcard. Defaults to "Contact {agency}" if left blank.'
                    )
                  }}
                </p>
              </div>

              <div class="pt-2 border-t border-slate-100">
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

              <div
                v-if="userProfile && userProfile?.coveredCategories?.length > 0"
                class="space-y-6">
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

          <!-- Desktop Live Preview Panel -->
          <div class="hidden xl:block relative">
            <div class="sticky top-28 space-y-6">
              <div>
                <h3 class="text-sm font-bold text-slate-800">
                  {{ $t('recruiter.leads.preview.live', 'Live Preview') }}
                </h3>
                <p class="text-xs text-slate-500 mt-1">
                  {{
                    $t(
                      'recruiter.leads.preview.live-helper',
                      'See how your contact card looks to candidates.'
                    )
                  }}
                </p>
              </div>

              <div v-if="userProfile?.coveredCategories?.length > 0" class="w-full">
                <AmIInputSelect
                  v-model="previewCategory"
                  :options="previewCategoryOptions"
                  single />
              </div>

              <AmICardLeadContact
                :title="form.title"
                :content="activePreviewContent"
                :logo-file="logoFile"
                :brand-bg-colour="form.brandBgColour"
                :brand-text-colour="form.brandTextColour"
                :logo-url="contactSettings?.logoUrl"
                :agency-name="userProfile?.agency_name"
                :button-text="form.buttonText"
                :location="userProfile?.billingCountry === 'USA' ? 'New York' : 'London'" />

              <div class="mt-8 flex flex-col items-center">
                <span class="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  {{ $t('recruiter.leads.preview.floating-button', 'CTA Button Preview') }}
                </span>
                <AmILeadFloatingButton
                  :text="previewButtonText"
                  :bg-colour="form.brandBgColour"
                  :text-colour="form.brandTextColour" />
              </div>
            </div>
          </div>
        </div>

        <div class="pt-6 mt-8 border-t border-slate-100 flex justify-end gap-3">
          <AmIButton
            bg-colour="bg-white"
            text-colour="text-slate-700"
            animation-colour="bg-slate-50"
            class="border border-slate-200 shadow-none block xl:hidden"
            @click="showPreviewModal = true">
            {{ $t('common.preview', 'Preview') }}
          </AmIButton>
          <AmIButton :loading="isSaving" @click="saveSettings">
            {{ $t('common.saved.save', 'Save Settings') }}
          </AmIButton>
        </div>
      </div>
    </div>

    <!-- PREVIEW MODAL -->
    <div
      v-if="showPreviewModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      @click.self="showPreviewModal = false">
      <div class="w-full max-w-md animate-in zoom-in-95 duration-200 flex flex-col">
        <div
          v-if="userProfile?.coveredCategories?.length > 0"
          class="w-full mb-4 bg-white p-4 rounded-2xl shadow-lg">
          <label class="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            {{
              $t(
                'recruiter.leads.preview.select-category',
                'Previewing as candidate searching for:'
              )
            }}
          </label>
          <AmIInputSelect v-model="previewCategory" :options="previewCategoryOptions" single />
        </div>

        <div class="w-full transition-all duration-300">
          <AmICardLeadContact
            :title="form.title"
            :content="activePreviewContent"
            :brand-bg-colour="form.brandBgColour"
            :brand-text-colour="form.brandTextColour"
            :logo-file="logoFile"
            :logo-url="contactSettings?.logoUrl"
            :agency-name="userProfile?.agency_name"
            :button-text="form.buttonText"
            :location="userProfile?.billingCountry === 'USA' ? 'New York' : 'London'"
            show-close
            @close="showPreviewModal = false" />

          <div class="mt-4 flex flex-col items-center bg-white p-4 rounded-2xl shadow-lg">
            <span class="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {{ $t('recruiter.leads.preview.floating-button', 'CTA Button Preview') }}
            </span>
            <AmILeadFloatingButton
              :text="previewButtonText"
              :bg-colour="form.brandBgColour"
              :text-colour="form.brandTextColour" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

definePageMeta({ middleware: 'recruiters' });

const { t } = useI18n();
const { userProfile } = useUserProfile();
const { contactSettings } = useContactSettings();
const user = useCurrentUser();
const storage = useFirebaseStorage();
const { showToast } = useSystemToast();

const activeTab = ref('leads');
const showWildcards = ref(false);
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
  brandBgColour: '#4f46e5',
  brandTextColour: '#ffffff',
  categoryContent: {} as Record<string, string>
});

const buttonTextError = computed(() => {
  if (form.buttonText && !/{agency}/i.test(form.buttonText)) {
    return t(
      'recruiter.leads.fields.button-text-error',
      'CTA button text must include the {agency} wildcard.'
    );
  }
  return '';
});

// --- Preview State ---
const showPreviewModal = ref(false);
const previewCategory = ref<string[]>(['default']);

const previewCategoryOptions = computed(() => {
  const opts = [
    { label: t('recruiter.leads.preview.general', 'General / Default'), value: 'default' }
  ];
  if (userProfile.value?.coveredCategories) {
    userProfile.value.coveredCategories.forEach((cat: string) => {
      opts.push({ label: cat, value: cat });
    });
  }
  return opts;
});

const activePreviewContent = computed(() => {
  const cat = previewCategory.value[0];
  if (cat && cat !== 'default' && form.categoryContent[cat]) {
    return form.categoryContent[cat];
  }
  return form.content;
});

const previewButtonText = computed(() => {
  const base = form.buttonText || 'Contact {agency}';
  const agency = userProfile.value?.agency_name || 'our agency';
  const location = userProfile.value?.billingCountry === 'USA' ? 'New York' : 'London';
  return base
    .replace(/{location}/gi, location)
    .replace(/{agency}/gi, agency)
    .replace(/{incentive}/gi, 'roles/candidates');
});

// Load existing Lead Contact Card settings
watch(
  contactSettings,
  (newSettings) => {
    if (newSettings) {
      form.title = newSettings.title || '';
      form.content = newSettings.content || '';
      form.buttonText = newSettings.buttonText || '';
      form.brandBgColour = newSettings.brandBgColour || '#4f46e5';
      form.brandTextColour = newSettings.brandTextColour || '#ffffff';
      form.categoryContent = { ...(newSettings.categoryContent || {}) };
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
  if (buttonTextError.value) {
    showToast('Error', buttonTextError.value, 'error');
    return;
  }

  isSaving.value = true;
  try {
    let uploadedLogoUrl = contactSettings.value?.logoUrl || '';

    // 1. Upload logo to Firebase Storage if a new file was selected
    if (logoFile.value && user.value) {
      const fileRef = storageRef(
        storage,
        `recruiter_logos/${user.value.uid}/${logoFile.value.name}`
      );
      await uploadBytes(fileRef, logoFile.value);
      uploadedLogoUrl = await getDownloadURL(fileRef);
    }

    const token = await user.value?.getIdToken();

    const finalButtonText = form.buttonText.trim() ? form.buttonText : 'Contact {agency}';

    // 2. Save settings to Nitro backend
    await $fetch('/api/user/recruiter/contact-settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: form.title,
        content: form.content,
        brandBgColour: form.brandBgColour,
        brandTextColour: form.brandTextColour,
        buttonText: finalButtonText,
        categoryContent: form.categoryContent,
        logoUrl: uploadedLogoUrl
      }
    });
    showToast('Success', 'Lead Contact Card settings saved successfully.', 'success');

    // Clear the local file state so it switches to the live uploaded URL
    logoFile.value = null;
    logoFileName.value = '';
  } catch {
    showToast('Error', 'Failed to save Lead Contact Card settings.', 'error');
  } finally {
    isSaving.value = false;
  }
};
</script>
