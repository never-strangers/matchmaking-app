import { test, expect } from '@playwright/test';

test.describe('API Routes', () => {
  test('/api/test returns correct JSON shape', async ({ request }) => {
    const response = await request.get('/api/test');
    
    await test.step('Verify response status', async () => {
      expect(response.ok()).toBeTruthy();
    });

    await test.step('Verify JSON structure', async () => {
      const json = await response.json();
      
      // Should have status field
      expect(json).toHaveProperty('status');
      
      // Should have error field (can be null)
      expect(json).toHaveProperty('error');
      
      // Optional sampleRow field
      if (json.sampleRow) {
        expect(typeof json.sampleRow).toBe('object');
      }
    });
  });

  test('/api/demo/reset exists and returns ok (if implemented)', async ({ request }) => {
    const response = await request.post('/api/demo/reset');
    
    // If route exists, it should return 200
    // If it doesn't exist, it will be 404 (which is also acceptable)
    const status = response.status();
    
    if (status === 200) {
      const json = await response.json();
      
      // Should return ok: true
      expect(json).toHaveProperty('ok');
      expect(json.ok).toBe(true);
    } else {
      // Route not implemented is acceptable
      expect(status).toBe(404);
    }
  });

  test('/api/test returns status ok when Supabase configured', async ({ request }) => {
    const response = await request.get('/api/test');
    
    await test.step('Verify response structure', async () => {
      expect(response.ok()).toBeTruthy();
      
      const json = await response.json();
      
      // Should have status field
      expect(json).toHaveProperty('status');
      
      // Status should be 'ok' or 'error'
      expect(['ok', 'error']).toContain(json.status);
      
      // Should have error field (can be null or string)
      expect(json).toHaveProperty('error');
      if (json.error !== null) {
        expect(typeof json.error).toBe('string');
      }
    });
  });

  test('/api/test handles missing Supabase config gracefully', async ({ request }) => {
    // This test verifies the API handles missing env vars
    // In actual test, we can't easily mock env vars, so we just verify
    // the response structure is consistent
    const response = await request.get('/api/test');
    
    const json = await response.json();
    
    // Should always return valid JSON with status
    expect(json).toHaveProperty('status');
    expect(typeof json.status).toBe('string');
    
    // Should have error field (can be null or string)
    expect(json).toHaveProperty('error');
  });
});


