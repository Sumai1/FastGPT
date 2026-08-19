import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';
import * as apiModule from '../../src/services/api';
import { mockPublicBootstrap } from '../mocks/mockData';

describe('Tier 1 & 2 Unit: URL Parameter Parsing & Direct Entry Portal (F-02 / F-05)', () => {
  beforeEach(() => {
    vi.spyOn(apiModule, 'fetchPublicBootstrap').mockResolvedValue(mockPublicBootstrap);
  });

  it('T1-URL-01: renders direct entry portal when no query params or path params exist', () => {
    delete (window as any).location;
    // @ts-ignore
    window.location = new URL('http://localhost:3000/');

    render(<App />);

    expect(screen.getByText('FastGPT 智能产品客服')).not.toBeNull();
    expect(screen.getByPlaceholderText(/例如: YIPAIJIHE_SUPPORT/)).not.toBeNull();
    expect(screen.getByText('进入')).not.toBeNull();
  });

  it('T1-URL-02: submitting direct entry form transitions to CustomerServiceApp', async () => {
    delete (window as any).location;
    // @ts-ignore
    window.location = new URL('http://localhost:3000/');

    render(<App />);

    const input = screen.getByPlaceholderText(/例如: YIPAIJIHE_SUPPORT/);
    fireEvent.change(input, { target: { value: 'DIRECT_TEST_PROJECT' } });

    const submitBtn = screen.getByText('进入').closest('button');
    fireEvent.click(submitBtn!);

    // Should call fetchPublicBootstrap with DIRECT_TEST_PROJECT
    expect(apiModule.fetchPublicBootstrap).toHaveBeenCalledWith({
      publicId: 'DIRECT_TEST_PROJECT',
      apiHost: undefined
    });
  });

  it('T1-URL-03: parses ?publicId=... from URL search query parameters', () => {
    delete (window as any).location;
    // @ts-ignore
    window.location = new URL('http://localhost:3000/?publicId=URL_QUERY_PROJECT');

    render(<App />);

    expect(apiModule.fetchPublicBootstrap).toHaveBeenCalledWith({
      publicId: 'URL_QUERY_PROJECT',
      apiHost: undefined
    });
  });

  it('T1-URL-04: parses ?project=... and ?projectCode=... fallback parameters', () => {
    delete (window as any).location;
    // @ts-ignore
    window.location = new URL('http://localhost:3000/?projectCode=CODE_PROJECT_99');

    render(<App />);

    expect(apiModule.fetchPublicBootstrap).toHaveBeenCalledWith({
      publicId: 'CODE_PROJECT_99',
      apiHost: undefined
    });
  });

  it('T1-URL-05: parses project code from URL pathname (e.g. /chat/PATH_PROJECT_01)', () => {
    delete (window as any).location;
    // @ts-ignore
    window.location = new URL('http://localhost:3000/chat/PATH_PROJECT_01');

    render(<App />);

    expect(apiModule.fetchPublicBootstrap).toHaveBeenCalledWith({
      publicId: 'PATH_PROJECT_01',
      apiHost: undefined
    });
  });

  it('T2-URL-01: prevents submission when direct entry input is empty', () => {
    delete (window as any).location;
    // @ts-ignore
    window.location = new URL('http://localhost:3000/');

    render(<App />);

    const submitBtn = screen.getByText('进入').closest('button');
    expect(submitBtn?.hasAttribute('disabled')).toBe(true);

    fireEvent.click(submitBtn!);
    expect(apiModule.fetchPublicBootstrap).not.toHaveBeenCalled();
  });
});
