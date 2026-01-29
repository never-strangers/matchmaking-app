-- Rename the demo event to "Unfiltered Farewell Event" for existing databases.
UPDATE events
SET title = 'Unfiltered Farewell Event'
WHERE id = '00000000-0000-0000-0000-000000000001';
