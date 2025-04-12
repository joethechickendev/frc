# FRC Stat Loader
A stat loader for FRC competitions. Can be used for competitions before 2025 as well.

# Form Calculations
A team's form is based on their performanced compared to their predicted performance in games. Their current form is based on the last 3 games instead of all of their games in a competition.

Form cannot be calculated for competitions that have not been played (for understandable reasons)

# Upsets
There are two types of upsets a team could face:
 - Another alliance upset them (Upset Loss)
 - They upset another alliance (Upset Won)
If they win a game with a small chance of winning or lose a game with a high chance of winning, the respective upset value is updated.
