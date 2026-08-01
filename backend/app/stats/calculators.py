import scipy.stats as stats
import math

def calculate_sample_size(
    p1: float = 0,
    mde: float = 0.05,
    alpha: float = 0.05,
    power: float = 0.8
) -> int:
    """
    Calculate the required sample size for a given population size, confidence level, and margin of error.

    Args:
        population_size (int): The total number of individuals in the population.
        confidence_level (float): The desired confidence level (default is 0.95).
        margin_of_error (float): The acceptable margin of error (default is 0.05).

    Returns:
        int: The calculated sample size.
    """
    
    p2 = p1 + mde
    
    # Get Z-scores for alpha and power
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    
    # Power formula implementation
    numerator = (z_alpha + z_beta)**2 * ((p1 * (1 - p1)) + (p2 * (1 - p2)))
    denominator = mde**2
    
    # Round up to the next whole integer
    return math.ceil(numerator / denominator)

def calculate_minimum_detectable_effect(
    p1: float = 0,
    n: int = 1000,
    alpha: float = 0.05,
    power: float = 0.8
):
    """
    Calculate the minimum detectable effect (MDE) for a given population size, confidence level, and sample size.

    Args:
        population_size (int): The total number of individuals in the population.
        confidence_level (float): The desired confidence level (default is 0.95).
        sample_size (int): The number of individuals in the sample.

    Returns:
        float: The calculated minimum detectable effect.
    """
    # Calculate the z-score for the given confidence level
    z_alpha = stats.norm.ppf(1 - alpha / 2)
    z_beta = stats.norm.ppf(power)
    
    # Standard error approximation assuming p1 is close to p2
    standard_error = ((2 * p1 * (1 - p1)) / n) ** 0.5
    
    # Calculate absolute MDE
    mde = (z_alpha + z_beta) * standard_error
    return mde