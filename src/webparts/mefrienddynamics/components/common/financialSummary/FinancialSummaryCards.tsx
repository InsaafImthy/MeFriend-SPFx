import * as React from 'react';
import { AmountDisplay, AmountDisplayVariant } from '../amountDisplay/AmountDisplay';
import styles from './FinancialSummaryCards.module.scss';

export type FinancialSummaryCardType = 'normal' | 'paid' | 'outstanding' | 'total';

export interface IFinancialSummaryCard {
  key: string;
  label: string;
  amount?: number;
  value?: React.ReactNode;
  currencyCode?: string;
  type?: FinancialSummaryCardType;
}

export interface IFinancialSummaryCardsProps {
  cards: readonly IFinancialSummaryCard[];
  accented?: boolean;
}

export const FinancialSummaryCards: React.FC<IFinancialSummaryCardsProps> = ({ cards }) => (
  <div className={styles.cards}>
    {cards.map(card => (
      <section className={styles.card} key={card.key}>
        <span className={styles.label}>{card.label}</span>
        <strong className={styles.value}>
          {card.amount !== undefined ? (
            <AmountDisplay amount={card.amount} currencyCode={card.currencyCode} variant={(card.type || 'normal') as AmountDisplayVariant} />
          ) : (
            card.value || '-'
          )}
        </strong>
      </section>
    ))}
  </div>
);
