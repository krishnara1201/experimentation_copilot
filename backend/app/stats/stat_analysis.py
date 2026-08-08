from scipy import stats
from enum import Enum

class uplift_mode(str, Enum):
    ABSOLUTE = "absolute"
    RELATIVE = "relative"

class test_type(str, Enum):
    TWO_SIDED = "two-sided"
    ONE_SIDED = "one-sided"

def calculate_result_significance(p1: float, p2: float, n1: int, n2: int, alpha: float = 0.05, test_type: test_type = test_type.TWO_SIDED) -> bool:
    """
    Calculate the statistical significance of the difference between two proportions.

    Args:
        p1 (float): Proportion of successes in group 1.
        p2 (float): Proportion of successes in group 2.
        n1 (int): Sample size of group 1.
        n2 (int): Sample size of group 2.
        alpha (float): Significance level (default is 0.05).

    Returns:
        bool: True if the difference is statistically significant, False otherwise.
    """
    # Calculate the pooled proportion
    pooled_p = (p1 * n1 + p2 * n2) / (n1 + n2)
    
    # Calculate the standard error
    se = ((pooled_p * (1 - pooled_p)) * (1/n1 + 1/n2)) ** 0.5
    
    # Calculate the z-score
    z_score = (p1 - p2) / se
    
    # Calculate the critical z-value for the given alpha
    if test_type == test_type.TWO_SIDED:
        critical_z = stats.norm.ppf(1 - alpha / 2)
        return bool(abs(z_score) > critical_z)
    else:
        critical_z = stats.norm.ppf(1 - alpha)
        return bool(z_score > critical_z)

def calculate_result_p_value(p1: float, p2: float, n1: int, n2: int, test_type: test_type = test_type.TWO_SIDED) -> float:
    """
    Calculate the p-value for the difference between two proportions.

    Args:
        p1 (float): Proportion of successes in group 1.
        p2 (float): Proportion of successes in group 2.
        n1 (int): Sample size of group 1.
        n2 (int): Sample size of group 2.

    Returns:
        float: The calculated p-value.
    """
    # Calculate the pooled proportion
    pooled_p = (p1 * n1 + p2 * n2) / (n1 + n2)
    
    # Calculate the standard error
    se = ((pooled_p * (1 - pooled_p)) * (1/n1 + 1/n2)) ** 0.5
    
    # Calculate the z-score
    z_score = (p1 - p2) / se
    
    # Calculate the two-tailed p-value
    if test_type == test_type.TWO_SIDED:
        p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
    else:
        p_value = 1 - stats.norm.cdf(z_score)
    
    return p_value

def calculate_result_ci(p1: float, p2: float, n1: int, n2: int, alpha: float = 0.05, test_type: test_type = test_type.TWO_SIDED) -> tuple:
    """
    Calculate the confidence interval for the difference between two proportions.

    Args:
        p1 (float): Proportion of successes in group 1.
        p2 (float): Proportion of successes in group 2.
        n1 (int): Sample size of group 1.
        n2 (int): Sample size of group 2.
        alpha (float): Significance level (default is 0.05).

    Returns:
        tuple: Lower and upper bounds of the confidence interval.
    """
    # Calculate the standard error
    se = ((p1 * (1 - p1) / n1) + (p2 * (1 - p2) / n2)) ** 0.5
    
    # Calculate the critical z-value for the given alpha
    if test_type == test_type.TWO_SIDED:
        critical_z = stats.norm.ppf(1 - alpha / 2)
    else:
        critical_z = stats.norm.ppf(1 - alpha)
    
    # Calculate the margin of error
    margin_of_error = critical_z * se
    
    # Calculate the confidence interval
    ci_lower = (p1 - p2) - margin_of_error
    ci_upper = (p1 - p2) + margin_of_error
    
    return ci_lower, ci_upper

def calculate_uplift(p1: float, p2: float, mode: uplift_mode = uplift_mode.ABSOLUTE) -> float:
    """
    Calculate the uplift between two proportions.

    Args:
        p1 (float): Proportion of successes in group 1.
        p2 (float): Proportion of successes in group 2.

    Returns:
        float: The calculated uplift.
    """
    return p2 - p1 if mode == uplift_mode.ABSOLUTE else (p2 - p1) / p1 if p1 != 0 else float('inf')

def calculate_srm(p1: float, p2: float, n1: int, n2: int, alpha: float = 0.05) -> float:
    """
    Calculate the p-value for a Sample Ratio Mismatch (SRM) check between two groups.
    A caller should treat p < alpha as a significant mismatch.

    Args:
        p1 (float): Proportion of successes in group 1.
        p2 (float): Proportion of successes in group 2.
        n1 (int): Sample size of group 1.
        n2 (int): Sample size of group 2.
        alpha (float): Significance level (default is 0.05), kept for API compatibility.

    Returns:
        float: The chi-squared goodness-of-fit p-value for the observed sample ratio.
    """
    # Calculate the expected proportions based on sample sizes
    total_n = n1 + n2
    expected_p1 = n1 / total_n
    expected_p2 = n2 / total_n

    # Calculate the observed proportions
    observed_p1 = p1 * n1 / total_n
    observed_p2 = p2 * n2 / total_n

    # Calculate the chi-squared statistic
    chi_squared_stat = ((observed_p1 - expected_p1) ** 2 / expected_p1) + ((observed_p2 - expected_p2) ** 2 / expected_p2)

    # Convert the chi-squared statistic (df=1) to a p-value
    return 1 - stats.chi2.cdf(chi_squared_stat, df=1)
