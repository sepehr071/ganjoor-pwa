package io.github.sepehr071.ganjoor;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class DailyPoemWidgetTest {
    @Test
    public void shuffleStaysInTheSelectionAndSkipsTheCurrentPoem() {
        assertEquals(1, DailyPoemWidget.anotherIndex(0, 2));
        assertEquals(0, DailyPoemWidget.anotherIndex(1, 2));

        for (int count : new int[] { 7, 28 }) {
            for (int current = 0; current < count; current++) {
                for (int draw = 0; draw < 64; draw++) {
                    int next = DailyPoemWidget.anotherIndex(current, count);
                    assertTrue(next >= 0 && next < count && next != current);
                }
            }
        }
    }
}
