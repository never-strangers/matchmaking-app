-- Trigger to keep event_ticket_types.sold accurate when attendees are removed or canceled.
-- The reserve_ticket RPC increments sold on reserve; this trigger decrements on:
--   DELETE: attendee removed while reserved or paid
--   UPDATE: ticket_status changes away from reserved/paid (canceled, expired, waitlisted)
--           or ticket_type_id changes (swap tiers)

CREATE OR REPLACE FUNCTION fn_adjust_ticket_sold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Decrement sold if the row held a counted slot
    IF OLD.ticket_type_id IS NOT NULL AND OLD.ticket_status IN ('reserved', 'paid') THEN
      UPDATE event_ticket_types
      SET sold = GREATEST(0, sold - 1), updated_at = now()
      WHERE id = OLD.ticket_type_id;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Old row was counting toward sold
    IF OLD.ticket_type_id IS NOT NULL AND OLD.ticket_status IN ('reserved', 'paid') THEN
      -- Status dropped out of counted states, OR ticket type changed
      IF NEW.ticket_status NOT IN ('reserved', 'paid') OR NEW.ticket_type_id IS DISTINCT FROM OLD.ticket_type_id THEN
        UPDATE event_ticket_types
        SET sold = GREATEST(0, sold - 1), updated_at = now()
        WHERE id = OLD.ticket_type_id;
      END IF;
    END IF;

    -- New row is counting toward sold on a DIFFERENT type (tier swap)
    IF NEW.ticket_type_id IS NOT NULL
       AND NEW.ticket_status IN ('reserved', 'paid')
       AND NEW.ticket_type_id IS DISTINCT FROM OLD.ticket_type_id
    THEN
      UPDATE event_ticket_types
      SET sold = sold + 1, updated_at = now()
      WHERE id = NEW.ticket_type_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_adjust_ticket_sold ON event_attendees;
CREATE TRIGGER trg_adjust_ticket_sold
  AFTER DELETE OR UPDATE OF ticket_status, ticket_type_id ON event_attendees
  FOR EACH ROW EXECUTE FUNCTION fn_adjust_ticket_sold();
