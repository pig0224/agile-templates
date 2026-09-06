import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import App from './App.vue';

describe('App', () => {
  it('渲染项目标题（占位测试，TDD 时替换为真实用例）', () => {
    const wrapper = mount(App);
    expect(wrapper.find('h1').text()).toBe('{{name}}');
  });
});
