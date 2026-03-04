import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TierProgressProps {
  currentTier: string;
  progress: number;
  tiers?: string[];
}

const DEFAULT_TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum'];

export default function TierProgress({
  currentTier,
  progress,
  tiers = DEFAULT_TIERS,
}: TierProgressProps) {
  const tierData = useMemo(() => {
    const pct = Math.max(0, Math.min(100, progress));
    const currentTierIndex = tiers.findIndex(
      (t) => t.toLowerCase() === currentTier.toLowerCase(),
    );

    const segmentCount = tiers.length - 1;
    const baseOffset = (currentTierIndex / segmentCount) * 100;
    const activeSegmentWidth = 100 / segmentCount;
    const totalProgressWidth = baseOffset + (pct / 100) * activeSegmentWidth;

    const isMaxTier = currentTierIndex === tiers.length - 1;

    return {
      pct,
      currentTierIndex,
      segmentCount,
      totalProgressWidth,
      isMaxTier,
    };
  }, [currentTier, progress, tiers]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Current Status</Text>
          <Text style={styles.tierName}>{currentTier}</Text>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>

      {/* Progress Bar Section */}
      <View style={styles.progressSection}>
        {/* Base gray line */}
        <View style={styles.progressBarBg}>
          {/* Red progress line */}
          <View
            style={[
              styles.progressFill,
              {
                width: `${tierData.isMaxTier ? 100 : tierData.totalProgressWidth}%`,
              },
            ]}
          />

          {/* Tier dots */}
          {tiers.map((_, i) => {
            const leftPosition = (i / tierData.segmentCount) * 100;
            const isEarned = i <= tierData.currentTierIndex;

            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    left: `${leftPosition}%`,
                  },
                  isEarned && styles.dotActive,
                ]}
              />
            );
          })}
        </View>

        {/* Tier labels */}
        <View style={styles.labelsContainer}>
          {tiers.map((t, i) => {
            const isActive = t.toLowerCase() === currentTier.toLowerCase();
            return (
              <View key={t} style={styles.labelWrapper}>
                <Text
                  style={[
                    styles.tierLabel,
                    isActive && styles.tierLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {t}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Progress Text */}
      {!tierData.isMaxTier && (
        <View style={styles.progressTextContainer}>
          <View style={styles.percentageBadge}>
            <Text style={styles.percentageText}>{Math.round(tierData.pct)}% Complete</Text>
          </View>
          <Text style={styles.nextTierText}>
            to {tiers[tierData.currentTierIndex + 1]} Tier
          </Text>
        </View>
      )}

      {tierData.isMaxTier && (
        <View style={styles.maxTierContainer}>
          <Text style={styles.maxTierText}>🎉 You've reached the highest tier!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  progressSection: {
    marginVertical: 16,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#d81b60',
    borderRadius: 4,
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    top: -2,
    marginLeft: -6,
  },
  dotActive: {
    backgroundColor: '#d81b60',
    borderColor: '#d81b60',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  tierLabelActive: {
    color: '#d81b60',
  },
  progressTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  percentageBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
  },
  nextTierText: {
    fontSize: 10,
    color: '#999',
  },
  maxTierContainer: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff8f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  maxTierText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff6b35',
  },
});
