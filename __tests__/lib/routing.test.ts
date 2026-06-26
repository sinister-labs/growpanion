import { describe, expect, it } from 'vitest';
import { getRouteBoundaryKey, normalizeRouteParams, normalizeRouteState, parseSavedRouteState } from '@/hooks/useRouting';

describe('routing utilities', () => {
    it('drops non-string route params', () => {
        expect(normalizeRouteParams({
            id: ' grow-1 ',
            tab: 'plants',
            blank: '   ',
            page: 2,
            nested: { value: 'bad' },
        })).toEqual({
            id: 'grow-1',
            tab: 'plants',
        });
    });

    it('falls back to dashboard for grow detail routes without an id', () => {
        expect(normalizeRouteState('growDetail', {})).toEqual({
            view: 'dashboard',
            routeParams: {},
        });
        expect(normalizeRouteState('growDetail', { id: '   ' })).toEqual({
            view: 'dashboard',
            routeParams: {},
        });
    });

    it('keeps valid grow detail routes with string params', () => {
        expect(normalizeRouteState('growDetail', { id: 'grow-1' })).toEqual({
            view: 'growDetail',
            routeParams: { id: 'grow-1' },
        });
    });

    it('ignores malformed saved route state', () => {
        expect(parseSavedRouteState('{bad json')).toBeNull();
        expect(parseSavedRouteState('null')).toBeNull();
        expect(parseSavedRouteState(JSON.stringify({ view: 'missing' }))).toBeNull();
    });

    it('restores only valid saved routes with normalized params', () => {
        expect(parseSavedRouteState(JSON.stringify({
            view: 'growDetail',
            routeParams: {
                id: 'grow-1',
                tab: 'plants',
                ignored: 1,
            },
        }))).toEqual({
            view: 'growDetail',
            routeParams: {
                id: 'grow-1',
                tab: 'plants',
            },
        });
    });

    it('builds distinct error boundary keys for route changes', () => {
        expect(getRouteBoundaryKey('dashboard')).toBe('dashboard:');
        expect(getRouteBoundaryKey('settings')).toBe('settings:');
        expect(getRouteBoundaryKey('growDetail', { id: 'grow-1' })).toBe('growDetail:grow-1');
        expect(getRouteBoundaryKey('growDetail', { id: 'grow-2' })).toBe('growDetail:grow-2');
    });

    it('uses the dashboard boundary key for invalid detail routes', () => {
        expect(getRouteBoundaryKey('growDetail', {})).toBe('dashboard:');
    });
});
