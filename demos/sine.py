import matplotlib.pyplot as plt

import numpy as np
x = np.linspace(0, 2.0 * np.pi, 100)
y = np.sin(x)

plt.figure()
plt.plot(x, y)
plt.show()
