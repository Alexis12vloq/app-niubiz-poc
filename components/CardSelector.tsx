import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  cards: any[];
  selectedToken: string | null;
  onSelect: (token: string) => void;
}

const CardSelector = ({ cards, selectedToken, onSelect }: Props) => {
  return (
    <View>
      <Text style={styles.title}>Selecciona una tarjeta guardada:</Text>
      {cards.map((card, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.card, selectedToken === card.token && styles.selected]}
          onPress={() => onSelect(card.token)}
        >
          <Text>{card.card_type} terminada en {card.last_four}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default CardSelector;

const styles = StyleSheet.create({
  title: { fontWeight: 'bold', fontSize: 18, marginBottom: 10 },
  card: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  selected: {
    borderColor: '#3b8bff',
    backgroundColor: '#eaf3ff',
  },
});