-- Align with documented availability: AVAILABLE | ASSIGNED | ON_TRIP | INACTIVE
UPDATE drivers
SET status = 0,
    availability_status = 'INACTIVE'
WHERE availability_status = 'ON_LEAVE';

UPDATE helpers
SET status = 0,
    availability_status = 'INACTIVE'
WHERE availability_status = 'ON_LEAVE';
