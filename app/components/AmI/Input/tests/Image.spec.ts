import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AmIInputImage from '../Image.vue';

describe('AmI/Input/Image', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the upload placeholder when there is no existing URL or selected file', () => {
    const wrapper = mount(AmIInputImage, {
      props: { placeholder: 'Upload Logo (.png, .jpg)' }
    });

    expect(wrapper.text()).toContain('Upload Logo (.png, .jpg)');
    expect(wrapper.find('img').exists()).toBe(false);
  });

  it('shows a thumbnail and the file name for an already-uploaded image', () => {
    const wrapper = mount(AmIInputImage, {
      props: {
        existingUrl: 'https://example.com/logo.png',
        fileName: 'logo.png',
        changeHint: 'Click to upload a new image'
      }
    });

    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('https://example.com/logo.png');
    expect(wrapper.text()).toContain('logo.png');
    expect(wrapper.text()).toContain('Click to upload a new image');
  });

  it('prefers a newly selected file over the existing URL for the thumbnail', () => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:new-file') });
    const file = new File(['content'], 'new-logo.png', { type: 'image/png' });

    const wrapper = mount(AmIInputImage, {
      props: {
        existingUrl: 'https://example.com/old-logo.png',
        file,
        fileName: 'new-logo.png'
      }
    });

    expect(wrapper.find('img').attributes('src')).toBe('blob:new-file');
    expect(wrapper.text()).toContain('new-logo.png');
  });

  it('emits change with the underlying event when a file is chosen', async () => {
    const wrapper = mount(AmIInputImage);

    await wrapper.find('input[type="file"]').trigger('change');

    expect(wrapper.emitted('change')).toHaveLength(1);
  });

  it('revokes the previous Blob URL when a new file replaces it', async () => {
    let nextUrl = 'blob:first-file';
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => nextUrl),
      revokeObjectURL
    });

    const wrapper = mount(AmIInputImage, {
      props: { file: new File(['a'], 'first.png', { type: 'image/png' }) }
    });
    expect(wrapper.find('img').attributes('src')).toBe('blob:first-file');

    nextUrl = 'blob:second-file';
    await wrapper.setProps({ file: new File(['b'], 'second.png', { type: 'image/png' }) });

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first-file');
    expect(wrapper.find('img').attributes('src')).toBe('blob:second-file');
  });

  it('revokes the Blob URL on unmount', () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mounted-file'),
      revokeObjectURL
    });

    const wrapper = mount(AmIInputImage, {
      props: { file: new File(['a'], 'mounted.png', { type: 'image/png' }) }
    });
    wrapper.unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mounted-file');
  });

  it('does not revoke anything when a file is cleared back to an existing URL', async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:cleared-file'),
      revokeObjectURL
    });

    const wrapper = mount(AmIInputImage, {
      props: {
        file: new File(['a'], 'cleared.png', { type: 'image/png' }),
        existingUrl: 'https://example.com/saved.png'
      }
    });

    await wrapper.setProps({ file: null });

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cleared-file');
    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/saved.png');
  });
});
